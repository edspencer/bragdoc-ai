// Localhost security (SPEC R3, D10). BragDoc has no login: it listens on 127.0.0.1 and trusts whoever can reach it,
// which is only this computer. But a web page in your browser can still reach 127.0.0.1, two ways:
//
// - DNS rebinding: evil.example resolves to 127.0.0.1 a minute after you load it, and its scripts now talk to "their
//   own origin", which is BragDoc. The browser still sends `Host: evil.example`, so every request must carry an
//   allowed Host: loopback, or a name from config.yaml `allowedHosts` / BRAGDOC_ALLOWED_HOSTS (Docker, a reverse
//   proxy). Anything else is a 403, static files included.
// - Cross-site requests (CSRF): any page can POST a "simple" request (text/plain, a form) to localhost without a
//   preflight, or open an EventSource / WebSocket to it. So:
//     - an `Origin`, whenever a browser sends one, must be this server's own origin (its host:port must equal the
//       Host header). That covers writes, the SSE stream, and any streaming or WebSocket endpoint a later PR adds:
//       the check is on every request, so nothing can forget it (Paddock's WebSocket-origin gap, edspencer/paddock#975,
//       was exactly a route that did).
//     - `Sec-Fetch-Site: cross-site | same-site` on the API is refused outright (Fetch Metadata), for the browsers
//       that send it, which is all current ones. Same-site matters on shared hostnames: another app on a sibling
//       subdomain is "same-site" but not us.
//     - writes are JSON, or a typed upload on a route that opted in (UploadRegistry), and never one of the three
//       CORS-safelisted types (text/plain, multipart/form-data, application/x-www-form-urlencoded). A cross-site page
//       can't send any other type without a preflight, and we never grant one: no CORS headers are ever sent.
//
// Adapted from Hallway's and Local Review's security.ts (localOnly), plus: the same-origin Origin rule on every
// request (not just writes), Fetch Metadata, opt-in typed uploads, body limits, and the security headers and CSP.
import type { Context, MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { apiError } from './http.js';
import { normalizeHostname } from './config.js';

/** Hostnames that are always allowed. */
export const LOOPBACK_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'] as const;

/** 1 MB for a JSON body; 25 MB for an upload (SPEC R3). */
export const JSON_LIMIT = 1024 * 1024;
export const UPLOAD_LIMIT = 25 * 1024 * 1024;

/** The SPA's Content-Security-Policy, exactly as SPEC R3 gives it. No inline scripts or styles, ever. */
export const SPA_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

/** Evidence blobs: nothing in them may run, even opened directly (an SVG with a script, an HTML file named .png). */
export const BLOB_CSP = "default-src 'none'; sandbox";

/** True when `host` (a Host header or URL host, port and all) names an allowed hostname. */
export function isAllowedHost(host: string | undefined | null, extra: readonly string[] = []): boolean {
  if (!host) return false;
  const h = normalizeHostname(host);
  return (LOOPBACK_HOSTNAMES as readonly string[]).includes(h) || extra.includes(h);
}

/** A Host header's authority as an Origin carries it: lower case, without a default port. */
function authority(host: string): string {
  return host.trim().toLowerCase().replace(/:(?:80|443)$/, '');
}

/**
 * True when `origin` is this server's own origin, as reached through `host` (the request's Host header): an http(s)
 * origin whose host:port is the Host. `null` (a sandboxed frame, a file:// page) and anything unparseable are false.
 * The scheme isn't compared: behind a TLS-terminating proxy the server can't know it.
 */
export function isSameOrigin(origin: string, host: string | undefined | null): boolean {
  if (!host) return false;
  try {
    const u = new URL(origin);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.host === authority(host);
  } catch {
    return false;
  }
}

/** The three content types a cross-site page can send without a preflight. Never accepted for a write. */
export const CORS_SAFELISTED = /^(?:text\/plain|multipart\/form-data|application\/x-www-form-urlencoded)\s*(?:;|$)/i;
const JSON_TYPE = /^application\/json\s*(?:;|$)/i;

export interface UploadRule {
  method: string;
  /** Matched against the whole path, e.g. /^\/api\/achievements\/[^/]+\/evidence$/. */
  path: RegExp;
  /** The accepted Content-Types, e.g. /^image\/(?:png|jpeg)$/i. Checked never to admit a CORS-safelisted type. */
  types: RegExp;
  /** At most UPLOAD_LIMIT. */
  maxBytes?: number;
}

/**
 * Routes that take a raw typed body (an image, a PDF) instead of JSON. A route module opts in from its
 * register<Feature>(), via ctx.uploads.accept(…), before any request arrives; everything else is JSON-only.
 */
export class UploadRegistry {
  private rules: UploadRule[] = [];

  accept(rule: UploadRule): void {
    for (const t of ['text/plain', 'multipart/form-data', 'application/x-www-form-urlencoded'])
      if (rule.types.test(t)) throw new Error(`an upload route may not accept ${t}: it's CORS-safelisted, so any web page could send it (SPEC R3)`);
    if ((rule.maxBytes ?? UPLOAD_LIMIT) > UPLOAD_LIMIT) throw new Error(`an upload is at most ${UPLOAD_LIMIT} bytes (SPEC R3)`);
    this.rules.push(rule);
  }

  /** The rule for this request, if its route takes uploads and its Content-Type is one the route accepts. */
  match(method: string, path: string, contentType: string): UploadRule | undefined {
    const type = contentType.split(';')[0]!.trim();
    return this.rules.find((r) => r.method === method && r.path.test(path) && r.types.test(type));
  }
}

/** The API (and /mcp): where cross-site and same-site fetches are refused by Fetch Metadata. */
const isApi = (p: string) => p === '/api' || p.startsWith('/api/') || p === '/mcp' || p.startsWith('/mcp/');

function deny(c: Context, status: 403 | 415, code: string, message: string) {
  return c.json(apiError(code, message), status);
}

export interface SecurityOptions {
  /** Extra allowed hostnames, asked on every request so edits to config.yaml apply at once. */
  allowedHosts: () => readonly string[];
  uploads: UploadRegistry;
}

/** The guard for every request: `app.use('*', security(…))`, first, before any route (index.ts). */
export function security({ allowedHosts, uploads }: SecurityOptions): MiddlewareHandler {
  return async (c, next) => {
    // a refusal is returned; an allowed request has run the rest of the chain (next) by the time guard() resolves
    const refused = await guard(c, next, allowedHosts(), uploads);
    if (refused) c.res = refused;
    applyHeaders(c);
  };
}

async function guard(c: Context, next: () => Promise<void>, extra: readonly string[], uploads: UploadRegistry): Promise<Response | null> {
  const pass = async () => {
    await next();
    return null;
  };
  const host = c.req.header('host');
  // The Host header is what a rebinding browser sends; the URL's host is checked too, because an absolute-form request
  // line (`GET http://localhost/ HTTP/1.1`) sets it separately. In-process requests (tests) have only the URL.
  if ((host !== undefined && !isAllowedHost(host, extra)) || !isAllowedHost(new URL(c.req.url).host, extra))
    return deny(c, 403, 'forbidden_host', 'This address is not one BragDoc answers to. To reach it through another name, add it to allowedHosts in config.yaml.');
  const authority = host ?? new URL(c.req.url).host;
  const origin = c.req.header('origin');
  if (origin !== undefined && !isSameOrigin(origin, authority)) return deny(c, 403, 'forbidden_origin', 'Cross-origin requests are not allowed.');
  const site = c.req.header('sec-fetch-site');
  if (isApi(c.req.path) && (site === 'cross-site' || site === 'same-site')) return deny(c, 403, 'forbidden_origin', 'Cross-site requests are not allowed.');

  const method = c.req.method;
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return pass();
  const ct = c.req.header('content-type') ?? '';
  const hasBody = c.req.header('transfer-encoding') !== undefined || Number(c.req.header('content-length') ?? 0) > 0;
  // DELETE can't be sent cross-site without a preflight, so a body-less one needs no Content-Type. POST, PUT and
  // PATCH always need one (a body-less POST with none is a simple request any page can send).
  if (method === 'DELETE' && !hasBody && !ct) return pass();
  const upload = ct && !CORS_SAFELISTED.test(ct) ? uploads.match(method, c.req.path, ct) : undefined;
  if (!upload && !JSON_TYPE.test(ct))
    return deny(c, 415, 'unsupported_media_type', 'Send JSON (Content-Type: application/json), or a typed upload where the route takes one.');
  const limit = upload ? (upload.maxBytes ?? UPLOAD_LIMIT) : JSON_LIMIT;
  const r = await bodyLimit({
    maxSize: limit,
    onError: (c) => c.json(apiError('too_large', `The body is larger than ${Math.round(limit / 1024 / 1024)} MB.`), 413),
  })(c, next);
  return r instanceof Response ? r : null;
}

/** Security headers on every response; a route that set its own CSP (blobHeaders) keeps it. */
function applyHeaders(c: Context): void {
  const h = c.res.headers;
  if (!h.has('Content-Security-Policy')) h.set('Content-Security-Policy', SPA_CSP);
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'no-referrer');
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  // nothing here is for other sites to embed (a <script>, an <img>): this stops them even trying
  h.set('Cross-Origin-Resource-Policy', 'same-origin');
  // the API returns your data: no cache anywhere, ever
  if (isApi(c.req.path) && !h.has('Cache-Control')) h.set('Cache-Control', 'no-store');
}

/** Image types shown inline. SVG only ever goes in an <img> (SPEC R3), where its scripts can't run. */
const INLINE_IMAGE = /^image\/(?:png|jpeg|gif|webp|avif|svg\+xml)$/i;

/**
 * Headers for serving an evidence blob (PR7): a sandboxing CSP, nosniff, same-origin only, and anything that isn't a
 * plain image downloads rather than opens. Spread them into the response's headers.
 */
export function blobHeaders(mime: string, filename?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': mime,
    'Content-Security-Policy': BLOB_CSP,
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  if (!INLINE_IMAGE.test(mime)) {
    const name = (filename ?? 'evidence').replace(/[^\w.-]+/g, '_');
    headers['Content-Disposition'] = `attachment; filename="${name}"`;
  }
  return headers;
}
