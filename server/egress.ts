// The one way out (SPEC R4, D9). BragDoc has no telemetry and no update check; the only outbound requests are to the
// services you connected, and they all go through egressFetch() here. test/guard-egress.test.ts fails CI if any
// other file in server/ or shared/ touches fetch, http(s), net, tls, dgram, undici or WebSocket.
//
// - Each request declares a `purpose` ("github.pulls"), which is what Settings → Network activity shows.
// - The allow-list is recomputed from config.yaml on every request, so disconnecting GitHub takes effect at once:
//   api.github.com only while GitHub is enabled with a token (with the gh CLI, gh makes the requests itself), plus
//   loopback (the `bragdoc mcp` shim talking to the running server). Anything else throws EgressDenied, and so does
//   plain http to anything but loopback.
// - Redirects are followed by hand, each hop re-checked against the allow-list: fetch's own redirect handling would
//   follow a 302 to anywhere.
// - Every request, allowed or denied, is appended to logs/network.jsonl (path only, never the query string, which
//   can carry secrets), and rotated at LOG_MAX_BYTES. `gh` runs are logged too (logProcess), honestly marked as
//   "via gh CLI": their traffic leaves outside this process, so all we can record is that we ran it.
// - AI (v0.2, SPEC R19): while `ai.enabled`, each local connection's host and each consented cloud connection's host
//   join the allow-list (server/ai/policy.ts aiHosts). A provider never gets egressFetch itself: it gets fetchFor(),
//   which re-checks that one connection (on, consented) on every call, refuses any host but its own, follows no
//   redirect, replaces the SDK's User-Agent with a fixed, versionless one and drops attribution headers. Its log lines
//   say where the call went (this computer, your network, internet), for which feature and model, and how many bytes
//   were sent: never the content. Plain http is allowed to this computer and your network only (shared/ai/hosts.ts).
// - One exception, by construction loopback-only (D51): the CLI's readiness probe, probeLoopback() and
//   loopbackAccepts() below, asks 127.0.0.1 whether BragDoc is up. Its host is fixed, it carries no data, and it isn't
//   logged: `bragdoc service start` polls every 250 ms, and a log of what leaves this computer isn't the place for it.
import fs from 'node:fs';
import net from 'node:net';
import type { NetworkLogEntry, NetworkLogResponse } from '../shared/api.js';
import type { AiCallFeature } from '../shared/ai/connections.js';
import { hostnameClass, isLocalClass } from '../shared/ai/hosts.js';
import { aiHosts, connectionGate, connectionOrigin, type GateCode } from './ai/policy.js';
import { appendLine } from './atomic.js';
import type { Config } from './config.js';
import { homePaths } from './home.js';

/** A request the allow-list doesn't cover. Nothing was sent. */
export class EgressDenied extends Error {
  constructor(
    readonly host: string,
    readonly purpose: string,
    message: string,
    /** For an AI call: which gate refused it (AI off, consent revoked…). */
    readonly code?: GateCode,
  ) {
    super(message);
    this.name = 'EgressDenied';
  }
}

/** Rotate logs/network.jsonl to network.1.jsonl past this size; one old file is kept. */
export const LOG_MAX_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 5;
const LOOPBACK = ['localhost', '127.0.0.1', '[::1]'];
/** Headers that may follow a redirect to another host. */
const SAFE_HEADERS = new Set(['accept', 'accept-language', 'user-agent', 'x-github-api-version']);
/** What every model call says it is: fixed and versionless, so a provider learns nothing about this install (SPEC R20). */
export const AI_USER_AGENT = 'BragDoc';
/** Headers a provider SDK may add to say who's calling (OpenRouter's app attribution, a referrer): never sent. */
const ATTRIBUTION_HEADERS = /^(?:referer|http-referer|x-title|x-openrouter-[\w-]+|x-stainless-[\w-]+)$/i;

/** The hosts outbound requests may go to under `config`, loopback included. */
export function egressAllowList(config: Config): string[] {
  const hosts = [...LOOPBACK];
  if (config.sources.github.enabled && config.sources.github.auth === 'token') hosts.push('api.github.com');
  for (const h of aiHosts(config)) if (!hosts.includes(h)) hosts.push(h);
  return hosts;
}

type FetchFn = (url: URL, init: RequestInit) => Promise<Response>;
/** The fetch a provider is given (globalThis.fetch's shape). */
export type ProviderFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/** The one real network call in the codebase (test/guard-egress.test.ts counts its globalThis). */
const realFetch: FetchFn = (url, init) => globalThis.fetch(url, init);

export interface EgressOptions {
  dataDir: string;
  /** The live settings (ConfigStore.get), asked on every request. */
  config: () => Config;
  /** Called after each log entry is written (the event bus's `network`). */
  onLog?: (e: NetworkLogEntry) => void;
  /** The real fetch, swappable in tests. */
  fetchImpl?: FetchFn;
  now?: () => Date;
}

export interface EgressRequest {
  /** Why BragDoc is making this request, e.g. `github.pulls`. Shown in Settings → Network activity. */
  purpose: string;
}

/** A model call's fetch: for which connection, feature and model (each log line carries them; SPEC R19). */
export interface AiFetchRequest extends EgressRequest {
  feature: AiCallFeature;
  model?: string;
  connectionId: string;
}

/** What a request's body weighs, when it's something we can measure without reading a stream. */
function bodyBytes(body: RequestInit['body']): number | null {
  if (body == null) return 0;
  if (typeof body === 'string') return Buffer.byteLength(body);
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  if (body instanceof URLSearchParams) return Buffer.byteLength(body.toString());
  if (body instanceof Blob) return body.size;
  return null;
}

export class Egress {
  private readonly file: string;
  private readonly impl: FetchFn;
  private readonly now: () => Date;

  constructor(private readonly opts: EgressOptions) {
    this.file = homePaths(opts.dataDir).networkLog;
    this.impl = opts.fetchImpl ?? realFetch;
    this.now = opts.now ?? (() => new Date());
  }

  /** The hosts allowed right now. */
  allowList(): string[] {
    return egressAllowList(this.opts.config());
  }

  /** fetch(), through the allow-list and the log. Throws EgressDenied (logged) for anything not allowed. */
  egressFetch({ purpose }: EgressRequest, input: string | URL, init: RequestInit = {}): Promise<Response> {
    return this.send(purpose, {}, input, init);
  }

  /**
   * The only fetch a model provider is ever given (SPEC R20). On every call it asks config.yaml again whether this one
   * connection may be used (AI on; local, or cloud with current consent), so turning AI off or revoking a connection
   * stops the next request even mid-run, and another connection on the same host is unaffected. It refuses any host
   * but the connection's own, follows no redirect, and sends a fixed User-Agent and no attribution headers.
   */
  fetchFor({ purpose, feature, model, connectionId }: AiFetchRequest): ProviderFetch {
    return async (input, init = {}) => {
      if (input instanceof Request) {
        // the SDKs pass a URL and an init; a Request is unpacked so its headers and body are seen like any other's
        init = { method: input.method, headers: input.headers, body: input.body === null ? undefined : await input.arrayBuffer(), signal: input.signal, ...init };
        input = input.url;
      }
      const url = new URL(input);
      const extra = { feature, ...(model ? { model } : {}), where: hostnameClass(url.hostname), sent: bodyBytes(init.body) };
      const config = this.opts.config();
      const gate = connectionGate(config, connectionId);
      // its own origin only (scheme, host and port): a provider can't be pointed at another service on the same machine
      const own = connectionOrigin(config.ai, connectionId);
      const refuse = gate?.message ?? (own !== url.origin ? `${url.origin} isn't where ${connectionId} points (${own ?? 'nowhere'})` : null);
      if (refuse) {
        this.log({ at: this.now().toISOString(), purpose, via: 'fetch', method: (init.method ?? 'GET').toUpperCase(), host: url.host, path: url.pathname, outcome: 'denied', status: null, bytes: null, error: refuse, ...extra });
        throw new EgressDenied(url.host, purpose, `BragDoc won't send a request to ${url.host} (${purpose}): ${refuse}`, gate?.code);
      }
      const headers = new Headers(init.headers);
      for (const k of [...headers.keys()]) if (ATTRIBUTION_HEADERS.test(k)) headers.delete(k);
      headers.set('user-agent', AI_USER_AGENT);
      return this.send(purpose, extra, url, { ...init, headers, redirect: 'manual' });
    };
  }

  /**
   * Settings → AI's "look for a model runner on this computer" (SPEC R18, D69): one GET to a runner's default address,
   * which isn't a configured connection, so fetchFor can't carry it. It is only ever this computer (or, in Docker, the
   * host through host.docker.internal), only a GET with no body and no credentials, only while AI is on, and never
   * follows a redirect. Logged like any AI call: `feature: detect`, and where it went.
   */
  probe({ purpose, feature }: { purpose: string; feature: 'detect' }, input: string | URL, { signal }: { signal?: AbortSignal } = {}): Promise<Response> {
    const url = new URL(input);
    const where = hostnameClass(url.hostname);
    const extra = { feature, where, sent: 0 };
    const refuse = !this.opts.config().ai.enabled
      ? 'AI is off (Settings → AI).'
      : !LOOPBACK.includes(url.hostname) && url.hostname !== 'host.docker.internal'
        ? 'a runner is only looked for on this computer'
        : url.protocol !== 'http:' || url.username || url.password || url.search
          ? 'a probe is a plain GET to a runner’s address'
          : null;
    if (refuse) {
      this.log({ at: this.now().toISOString(), purpose, via: 'fetch', method: 'GET', host: url.host, path: url.pathname, outcome: 'denied', status: null, bytes: null, error: refuse, ...extra });
      return Promise.reject(new EgressDenied(url.host, purpose, `BragDoc won't send a request to ${url.host} (${purpose}): ${refuse}`, this.opts.config().ai.enabled ? undefined : 'ai_off'));
    }
    return this.send(purpose, extra, url, { method: 'GET', headers: { 'user-agent': AI_USER_AGENT, accept: 'application/json' }, redirect: 'manual', ...(signal ? { signal } : {}) }, [url.hostname]);
  }

  /** Record a download a model runner makes itself (Ollama pulling a model): it leaves outside BragDoc, like gh's. */
  logVia(via: 'ollama', { purpose, feature, model, outcome, error }: { purpose: string; feature: AiCallFeature; model?: string; outcome: 'ok' | 'error'; error?: string }): void {
    this.log({
      at: this.now().toISOString(),
      purpose,
      via,
      method: 'RUN',
      host: 'registry (via Ollama)',
      path: model ? `pull ${model}` : 'pull',
      outcome,
      status: null,
      bytes: null,
      feature,
      ...(model ? { model } : {}),
      where: 'internet',
      ...(error ? { error } : {}),
    });
  }

  /** `alsoAllow`: hosts a caller has already vouched for (probe's), on top of the allow-list. */
  private async send(purpose: string, extra: Partial<NetworkLogEntry>, input: string | URL, init: RequestInit, alsoAllow: string[] = []): Promise<Response> {
    let url = new URL(input);
    let method = (init.method ?? 'GET').toUpperCase();
    let body = init.body;
    let headers = new Headers(init.headers);
    for (let hop = 0; ; hop++) {
      const at = this.now().toISOString();
      const denied = this.check(url, alsoAllow);
      if (denied) {
        this.log({ at, purpose, via: 'fetch', method, host: url.host, path: url.pathname, outcome: 'denied', status: null, bytes: null, error: denied, ...extra });
        throw new EgressDenied(url.host, purpose, `BragDoc won't send a request to ${url.host} (${purpose}): ${denied}`);
      }
      let res: Response;
      try {
        res = await this.impl(url, { ...init, method, body, headers, redirect: 'manual' });
      } catch (e) {
        this.log({ at, purpose, via: 'fetch', method, host: url.host, path: url.pathname, outcome: 'error', status: null, bytes: null, error: errorText(e), ...extra });
        throw e;
      }
      const len = res.headers.get('content-length');
      this.log({ at, purpose, via: 'fetch', method, host: url.host, path: url.pathname, outcome: 'ok', status: res.status, bytes: len === null ? null : Number(len), ...extra });
      const location = res.headers.get('location');
      if (res.status < 300 || res.status > 399 || res.status === 304 || !location || init.redirect === 'manual') return res;
      if (hop >= MAX_REDIRECTS) throw new Error(`too many redirects (${purpose})`);
      await res.body?.cancel();
      const next = new URL(location, url);
      // what a browser does: 303 (and 301/302 after a POST) become a GET without the body
      const toGet = res.status === 303 || ((res.status === 301 || res.status === 302) && method === 'POST');
      if (next.host !== url.host) {
        // a remote service must never be able to point us at this computer's own services
        const refuse =
          !LOOPBACK.includes(url.hostname) && LOOPBACK.includes(next.hostname)
            ? 'a remote host may not redirect to this computer'
            : isLocalClass(hostnameClass(next.hostname)) && hostnameClass(next.hostname) !== hostnameClass(url.hostname)
              ? 'a host may not redirect to this computer or your network'
            : !toGet && body != null
              ? "a request body isn't re-sent to another host"
              : null;
        if (refuse) {
          this.log({ at: this.now().toISOString(), purpose, via: 'fetch', method, host: next.host, path: next.pathname, outcome: 'denied', status: null, bytes: null, error: refuse });
          throw new EgressDenied(next.host, purpose, `BragDoc won't follow ${url.host}'s redirect to ${next.host} (${purpose}): ${refuse}`);
        }
        // credentials (Authorization, a token header, cookies) are for the host they were given to: only headers known
        // to be harmless cross to another one
        headers = new Headers([...headers].filter(([k]) => SAFE_HEADERS.has(k.toLowerCase())));
      }
      url = next;
      if (toGet) {
        method = 'GET';
        body = undefined;
        headers.delete('content-type');
        headers.delete('content-length');
      }
    }
  }

  /** Record a subprocess that talks to the network itself (the gh CLI): call it after the run, with how it went. */
  logProcess({ purpose, bin, args, exitCode, error }: { purpose: string; bin: 'gh'; args: string[]; exitCode: number | null; error?: string }): void {
    // `gh api repos/o/r/pulls?state=closed --jq …` → `gh api repos/o/r/pulls`: only the leading positional arguments,
    // up to the first flag (a flag's value can be a header or a GraphQL query), only if they look like a subcommand or a
    // path, and without a query string
    const shown: string[] = [];
    for (const a of args) {
      if (a.startsWith('-')) break;
      const p = a.split('?')[0]!;
      if (!/^[\w./@:-]+$/.test(p)) break;
      shown.push(p);
      if (shown.length === 3) break;
    }
    const cmd = shown.join(' ');
    this.log({
      at: this.now().toISOString(),
      purpose,
      via: bin,
      method: 'RUN',
      host: 'github.com (via gh CLI)',
      path: `${bin} ${cmd}`.trim(),
      outcome: error ? 'error' : 'ok',
      status: exitCode,
      bytes: null,
      ...(error ? { error } : {}),
    });
  }

  /** Why `url` isn't allowed, or null if it is. */
  private check(url: URL, alsoAllow: string[] = []): string | null {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return `${url.protocol} isn't allowed`;
    const allowed = [...this.allowList(), ...alsoAllow];
    if (!allowed.includes(url.hostname.toLowerCase())) return `${url.hostname} isn't on the allow-list (${allowed.join(', ')})`;
    // plain http to this computer, or to a model runner on your network (SPEC R19); https everywhere else
    if (url.protocol === 'http:' && !LOOPBACK.includes(url.hostname) && !isLocalClass(hostnameClass(url.hostname))) return 'only https leaves this computer';
    if (url.username || url.password) return 'credentials in a URL are not allowed';
    return null;
  }

  private log(e: NetworkLogEntry): void {
    try {
      rotateIfNeeded(this.file);
      appendLine(this.file, JSON.stringify(e));
    } catch (err) {
      // a log that can't be written mustn't break the request; say so where someone running it will see it
      process.stderr.write(`bragdoc: couldn't write the network log: ${(err as Error).message}\n`);
    }
    this.opts.onLog?.(e);
  }
}

/** A failed fetch's reason: undici hides the useful part ("connect ECONNREFUSED …") in `cause`. */
function errorText(e: unknown): string {
  const err = e as Error & { cause?: { code?: string; message?: string } };
  if (err?.name === 'AbortError' || err?.name === 'TimeoutError') return 'cancelled';
  return err?.cause?.code ? `${err.message} (${err.cause.code})` : (err?.message ?? String(e));
}

function assertPort(port: number): void {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError(`not a port: ${port}`);
}

/**
 * GET `http://127.0.0.1:<port><path>`, unlogged and without following redirects: the readiness probe's question to a
 * BragDoc that may be starting (D51). The host is fixed, so this can't be pointed anywhere but this computer. Rejects
 * as fetch does: refused, reset, or a TimeoutError after `timeoutMs`.
 */
export async function probeLoopback(port: number, pathname: string, timeoutMs: number): Promise<Response> {
  assertPort(port);
  if (!pathname.startsWith('/') || pathname.startsWith('//')) throw new RangeError(`not a path: ${pathname}`);
  return realFetch(new URL(`http://127.0.0.1:${port}${pathname}`), { signal: AbortSignal.timeout(timeoutMs), redirect: 'manual' });
}

/** Does anything accept a TCP connection on 127.0.0.1:port? The connection is closed at once, nothing is sent (D51). */
export async function loopbackAccepts(port: number, timeoutMs: number): Promise<boolean> {
  assertPort(port);
  return await new Promise((resolve) => {
    const s = net.connect({ port, host: '127.0.0.1' });
    const done = (v: boolean) => {
      s.destroy();
      resolve(v);
    };
    s.setTimeout(timeoutMs, () => done(false));
    s.once('connect', () => done(true));
    s.once('error', () => done(false));
  });
}

function rotateIfNeeded(file: string): void {
  let size: number;
  try {
    size = fs.statSync(file).size;
  } catch {
    return;
  }
  // network.1.jsonl, the one older file, is replaced: the log is a record of recent activity, kept to a bounded size
  if (size >= LOG_MAX_BYTES) fs.renameSync(file, file.replace(/\.jsonl$/, '.1.jsonl'));
}

/** The log, newest first, from network.jsonl and the rotated network.1.jsonl. Lines that don't parse are skipped. */
export function readNetworkLog(dataDir: string, { limit = 100, offset = 0 }: { limit?: number; offset?: number } = {}): NetworkLogResponse {
  const file = homePaths(dataDir).networkLog;
  const entries: NetworkLogEntry[] = [];
  for (const f of [file.replace(/\.jsonl$/, '.1.jsonl'), file]) {
    let text: string;
    try {
      text = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line) as NetworkLogEntry;
        if (typeof e.at === 'string' && typeof e.host === 'string') entries.push(e);
      } catch {
        /* a torn line (a crash mid-append): skip it */
      }
    }
  }
  entries.reverse();
  // what the Network tab's "To AI providers on the internet" line adds up: request bodies only, never content (SPEC R19)
  const toAiInternet = entries.reduce((n, e) => n + (e.where === 'internet' && e.via === 'fetch' && e.outcome === 'ok' && typeof e.sent === 'number' ? e.sent : 0), 0);
  return { entries: entries.slice(offset, offset + limit), total: entries.length, toAiInternet };
}
