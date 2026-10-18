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
// - One exception, by construction loopback-only (D48): the CLI's readiness probe, probeLoopback() and
//   loopbackAccepts() below, asks 127.0.0.1 whether BragDoc is up. Its host is fixed, it carries no data, and it isn't
//   logged: `bragdoc service start` polls every 250 ms, and a log of what leaves this computer isn't the place for it.
import fs from 'node:fs';
import net from 'node:net';
import type { NetworkLogEntry, NetworkLogResponse } from '../shared/api.js';
import { appendLine } from './atomic.js';
import type { Config } from './config.js';
import { homePaths } from './home.js';

/** A request the allow-list doesn't cover. Nothing was sent. */
export class EgressDenied extends Error {
  constructor(
    readonly host: string,
    readonly purpose: string,
    message: string,
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

/** The hosts outbound requests may go to under `config`, loopback included. */
export function egressAllowList(config: Config): string[] {
  const hosts = [...LOOPBACK];
  if (config.sources.github.enabled && config.sources.github.auth === 'token') hosts.push('api.github.com');
  return hosts;
}

type FetchFn = (url: URL, init: RequestInit) => Promise<Response>;

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
  async egressFetch({ purpose }: EgressRequest, input: string | URL, init: RequestInit = {}): Promise<Response> {
    let url = new URL(input);
    let method = (init.method ?? 'GET').toUpperCase();
    let body = init.body;
    let headers = new Headers(init.headers);
    for (let hop = 0; ; hop++) {
      const at = this.now().toISOString();
      const denied = this.check(url);
      if (denied) {
        this.log({ at, purpose, via: 'fetch', method, host: url.host, path: url.pathname, outcome: 'denied', status: null, bytes: null, error: denied });
        throw new EgressDenied(url.host, purpose, `BragDoc won't send a request to ${url.host} (${purpose}): ${denied}`);
      }
      let res: Response;
      try {
        res = await this.impl(url, { ...init, method, body, headers, redirect: 'manual' });
      } catch (e) {
        this.log({ at, purpose, via: 'fetch', method, host: url.host, path: url.pathname, outcome: 'error', status: null, bytes: null, error: (e as Error).message });
        throw e;
      }
      const len = res.headers.get('content-length');
      this.log({ at, purpose, via: 'fetch', method, host: url.host, path: url.pathname, outcome: 'ok', status: res.status, bytes: len === null ? null : Number(len) });
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
  private check(url: URL): string | null {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return `${url.protocol} isn't allowed`;
    const allowed = this.allowList();
    if (!allowed.includes(url.hostname.toLowerCase())) return `${url.hostname} isn't on the allow-list (${allowed.join(', ')})`;
    if (url.protocol === 'http:' && !LOOPBACK.includes(url.hostname)) return 'only https leaves this computer';
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

function assertPort(port: number): void {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError(`not a port: ${port}`);
}

/**
 * GET `http://127.0.0.1:<port><path>`, unlogged and without following redirects: the readiness probe's question to a
 * BragDoc that may be starting (D48). The host is fixed, so this can't be pointed anywhere but this computer. Rejects
 * as fetch does: refused, reset, or a TimeoutError after `timeoutMs`.
 */
export async function probeLoopback(port: number, pathname: string, timeoutMs: number): Promise<Response> {
  assertPort(port);
  if (!pathname.startsWith('/') || pathname.startsWith('//')) throw new RangeError(`not a path: ${pathname}`);
  return realFetch(new URL(`http://127.0.0.1:${port}${pathname}`), { signal: AbortSignal.timeout(timeoutMs), redirect: 'manual' });
}

/** Does anything accept a TCP connection on 127.0.0.1:port? The connection is closed at once, nothing is sent (D48). */
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
  return { entries: entries.slice(offset, offset + limit), total: entries.length };
}
