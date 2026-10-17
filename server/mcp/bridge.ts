// `bragdoc mcp`: a stdio MCP server for clients that prefer stdio (SPEC R11). It is a bridge, not a second server:
// every message read from stdin is POSTed to the running BragDoc's `/mcp`, and whatever comes back (a JSON body, or the
// events of an SSE stream) is written to stdout, one message per line. So there is one writer (the server), the bridge
// needs no knowledge of the tools, and it works with clients of either protocol era (2025's initialize handshake, or
// 2026-07-28's per-request metadata), because the server's handler speaks both and is stateless. Adapted from
// Hallway's server/mcp/bridge.ts.
//
// What the bridge adds is what the Streamable HTTP binding asks of a client and stdio doesn't carry (the
// `MCP-Protocol-Version`, `Mcp-Method` and `Mcp-Name` headers, and cancellation: stdio's `notifications/cancelled`
// becomes closing that request's HTTP response), plus BragDoc's own: the bearer token from runtime.json (read again
// once if the server refuses it, so a rotated token doesn't need a client restart), and `X-BragDoc-Client` from the
// client's initialize, so a 2025-era client's writes still say who wrote them. Requests go through the egress module
// (loopback only), so they're in the network log like everything else.
import readline from 'node:readline';
import type { Readable, Writable } from 'node:stream';

type Json = Record<string, unknown>;
type Id = string | number;

/** The legacy (2025) protocol version a client negotiated in its `initialize`, mirrored into later requests' headers. */
const META_VERSION = 'io.modelcontextprotocol/protocolVersion';

/** RFC 9110 visible ASCII and spaces, no leading or trailing space, and not already the sentinel: else Base64. */
export function headerValue(v: string): string {
  const plain = /^[\x21-\x7e]([\x20-\x7e]*[\x21-\x7e])?$/.test(v) && !(v.startsWith('=?base64?') && v.endsWith('?='));
  return plain ? v : `=?base64?${Buffer.from(v, 'utf8').toString('base64')}?=`;
}

/** The headers the Streamable HTTP binding wants on a POST of `msg`. */
export function headersFor(msg: Json, negotiated: string | null): Record<string, string> {
  const h: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  const params = (msg.params ?? {}) as Json;
  const meta = (params._meta ?? {}) as Json;
  const version = typeof meta[META_VERSION] === 'string' ? (meta[META_VERSION] as string) : msg.method === 'initialize' ? null : negotiated;
  if (version) h['mcp-protocol-version'] = headerValue(version);
  if (typeof msg.method === 'string') h['mcp-method'] = headerValue(msg.method);
  const name = msg.method === 'resources/read' ? params.uri : msg.method === 'tools/call' || msg.method === 'prompts/get' ? params.name : undefined;
  if (typeof name === 'string') h['mcp-name'] = headerValue(name);
  return h;
}

/** A client name fit for a header (`claude-code`), or null. */
export function clientHeader(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const v = name.replace(/[^\w .@/+-]/g, '').trim().slice(0, 60);
  return v || null;
}

/** The `data:` payloads of an SSE stream, as they arrive. */
export async function* sseMessages(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buf = '';
  let data: string[] = [];
  for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
    buf += decoder.decode(chunk, { stream: true });
    let nl: number;
    while ((nl = buf.search(/\r\n|\r|\n/)) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + (buf.startsWith('\r\n', nl) ? 2 : 1));
      if (line === '') {
        if (data.length) yield data.join('\n');
        data = [];
      } else if (line.startsWith('data:')) data.push(line.slice(line.startsWith('data: ') ? 6 : 5));
      // comments (`:` keep-alives), `event:`, `id:` and `retry:` lines carry nothing to forward
    }
  }
  if (data.length) yield data.join('\n');
}

export type BridgeFetch = (url: string, init: RequestInit) => Promise<Response>;

export interface BridgeOptions {
  /** The server's base URL, e.g. http://127.0.0.1:2724; asked per request (BragDoc may have restarted on another port). */
  base: () => string;
  /** The bearer token; called again once after a 401 (runtime.json may have a rotated one). */
  token: () => string | null;
  /** What to tell the user (in a JSON-RPC error) when the server has gone away. */
  notRunning: string;
  /** The HTTP client: the egress module's egressFetch, in the CLI. */
  fetch: BridgeFetch;
  stdin?: Readable;
  stdout?: Writable;
  stderr?: Writable;
}

/** Run the bridge until stdin ends. Resolves when everything in flight has finished or been cancelled. */
export function runBridge({ base, token, notRunning, fetch: doFetch, stdin = process.stdin, stdout = process.stdout, stderr = process.stderr }: BridgeOptions): Promise<void> {
  const inflight = new Map<Id, AbortController>();
  const pending = new Set<Promise<void>>();
  let negotiated: string | null = null;
  let client: string | null = null;
  let current = token();

  const send = (msg: unknown) => {
    stdout.write(JSON.stringify(msg) + '\n');
  };
  const error = (id: Id | null, code: number, message: string) => send({ jsonrpc: '2.0', id, error: { code, message } });

  /** Forward one JSON-RPC payload from the server, noting a legacy initialize's negotiated version on the way. */
  const forward = (text: string) => {
    let msg: Json;
    try {
      msg = JSON.parse(text);
    } catch {
      stderr.write(`bragdoc mcp: BragDoc sent something that isn't JSON: ${text.slice(0, 200)}\n`);
      return;
    }
    const result = msg.result as Json | undefined;
    if (result && typeof result.protocolVersion === 'string' && 'serverInfo' in result) negotiated = result.protocolVersion;
    send(msg);
  };

  const postOnce = (msg: Json, signal: AbortSignal, sent: string | null) => {
    const headers = headersFor(msg, negotiated);
    if (sent) headers.authorization = `Bearer ${sent}`;
    if (client) headers['x-bragdoc-client'] = client;
    return doFetch(`${base()}/mcp`, { method: 'POST', headers, body: JSON.stringify(msg), signal });
  };

  async function post(msg: Json) {
    const id = 'id' in msg && msg.method !== undefined ? (msg.id as Id) : null;
    const ac = new AbortController();
    if (id !== null) inflight.set(id, ac);
    try {
      const sent = current;
      let res = await postOnce(msg, ac.signal, sent);
      if (res.status === 401) {
        // the token may have been rotated since we started: runtime.json has the new one. Compared with the token this
        // request sent, not `current`: a request in flight alongside may have picked the new one up already
        const fresh = token();
        if (fresh && fresh !== sent) {
          await res.body?.cancel();
          current = fresh;
          res = await postOnce(msg, ac.signal, fresh);
        }
      }
      const type = res.headers.get('content-type') ?? '';
      if (res.status === 401) {
        await res.body?.cancel();
        if (id !== null)
          error(id, -32603, "BragDoc refused the MCP token in runtime.json. Is another BragDoc using this port, or a different data home? Restart BragDoc and reconnect.");
        else stderr.write('bragdoc mcp: BragDoc refused the MCP token in runtime.json\n');
        return;
      }
      if (res.status === 202 || id === null) {
        await res.body?.cancel();
        return;
      }
      if (type.includes('text/event-stream') && res.body) {
        for await (const data of sseMessages(res.body)) forward(data);
        return;
      }
      const text = await res.text();
      let body: Json | null = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        /* not JSON */
      }
      if (body && body.jsonrpc === '2.0' && ('result' in body || 'error' in body)) forward(text);
      else {
        const why = body && typeof body.error === 'object' && body.error && typeof (body.error as Json).message === 'string' ? `: ${(body.error as Json).message}` : '';
        error(id, -32603, `BragDoc answered HTTP ${res.status}${why}`);
      }
    } catch (e) {
      if (ac.signal.aborted) return; // cancelled: no response, as the spec says
      const cause = (e as Error).cause ? ((e as Error).cause as Error).message : (e as Error).message;
      if (id !== null) error(id, -32603, `${notRunning} (${cause})`);
      else stderr.write(`bragdoc mcp: ${(e as Error).message}\n`);
    } finally {
      if (id !== null) inflight.delete(id);
    }
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: stdin, crlfDelay: Infinity });
    rl.on('line', (line) => {
      if (!line.trim()) return;
      let msg: Json;
      try {
        msg = JSON.parse(line);
      } catch {
        error(null, -32700, 'Parse error: each line must be one JSON-RPC message');
        return;
      }
      if (Array.isArray(msg)) {
        // JSON-RPC batches were removed from MCP (2025-06-18); say so rather than drop them
        error(null, -32600, 'Invalid request: batches are not supported; send one message per line');
        return;
      }
      if (typeof msg.method !== 'string') return; // a response: the server never asks the client anything
      if (msg.method === 'notifications/cancelled') {
        const id = (msg.params as Json | undefined)?.requestId as Id | undefined;
        if (id !== undefined) inflight.get(id)?.abort();
        return;
      }
      if (msg.method === 'initialize') client = clientHeader(((msg.params as Json | undefined)?.clientInfo as Json | undefined)?.name) ?? client;
      const p = post(msg);
      pending.add(p);
      void p.finally(() => pending.delete(p));
    });
    rl.on('close', async () => {
      // stdin closed: the client has gone, so long-lived listen streams can go too; let ordinary requests finish
      for (const [, ac] of inflight) setTimeout(() => ac.abort(), 2000).unref();
      await Promise.allSettled([...pending]);
      resolve();
    });
  });
}
