// /mcp (SPEC R3, R11): the MCP endpoint, outside /api because MCP clients are configured with its URL. security.ts has
// already checked the Host, the Origin (if any), Fetch Metadata, the content type and the body size by the time a
// request gets here; this adds the bearer token from runtime.json, compared in constant time and read on every request
// so a rotated token takes effect at once. The token is checked before anything reads the body (Paddock's
// routes/mcp.ts: a malformed or oversized body never gets to pre-empt the auth decision).
//
// - 401 + `WWW-Authenticate: Bearer` for a missing or wrong token: never a redirect, which an MCP client can't follow.
// - 405 for GET and DELETE (after auth): stateless, there's no session to stream to or end, and the SDK would otherwise
//   answer a GET with an event stream that never says anything (Paddock).
// - /.well-known/oauth-*: a JSON 404. A client that gets a 401 goes looking for OAuth metadata there, and the SPA
//   fallback would otherwise hand it the web app's HTML with a 200.
import type { Hono } from 'hono';
import type { AppContext } from '../context.js';
import { apiError } from '../http.js';
import { mcpEndpoint } from '../mcp/index.js';
import { constantTimeEqual } from '../runtime.js';

/** The token from `Authorization: Bearer <token>`, or null. */
export function bearer(header: string | undefined): string | null {
  const m = /^Bearer[ \t]+([^\s]+)[ \t]*$/i.exec(header ?? '');
  return m ? m[1]! : null;
}

export function registerMcp(app: Hono, ctx: AppContext): void {
  const endpoint = mcpEndpoint({ store: ctx.store, services: ctx.services, config: () => ctx.config.get(), version: ctx.version });

  app.all('/mcp', async (c) => {
    const token = bearer(c.req.header('authorization'));
    if (!token || !constantTimeEqual(token, ctx.runtime.mcpToken())) {
      c.header('WWW-Authenticate', 'Bearer realm="bragdoc"');
      return c.json(
        apiError(
          'unauthorized',
          token
            ? "That isn't this BragDoc's MCP token (it may have been rotated). Run `bragdoc mcp install claude` again, or copy the token from Settings."
            : 'BragDoc needs its MCP token: `Authorization: Bearer <token>`. `bragdoc mcp install claude` sets it up; `bragdoc mcp` (stdio) reads it for you.',
        ),
        401,
      );
    }
    if (c.req.method === 'GET' || c.req.method === 'DELETE') {
      c.header('Allow', 'POST');
      return c.json(apiError('method_not_allowed', 'This MCP endpoint is stateless: POST JSON-RPC messages to it.'), 405);
    }
    return endpoint.fetch(c.req.raw);
  });

  app.get('/.well-known/oauth-*', (c) => c.json(apiError('not_found', "BragDoc's MCP endpoint uses a bearer token, not OAuth."), 404));
}
