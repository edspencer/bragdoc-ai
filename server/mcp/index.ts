// `/mcp` on BragDoc's own port (SPEC R11): MCP's Streamable HTTP transport, served by the official TypeScript SDK's
// stateless handler (one server instance per request, no sessions: the 2026-07-28 revision, with 2025-era clients
// served statelessly too). Adapted from Hallway's server/mcp/index.ts. The bearer token, Host and Origin checks are in
// front of it (server/routes/mcp.ts, server/security.ts).
//
// Change notifications come from the store: a `subscriptions/listen` stream hears `notifications/resources/updated`
// for bragdoc://context whenever a file in the data home changes (ours, a hand edit, another agent's).
import { createMcpHandler } from '@modelcontextprotocol/server';
import { CONTEXT_URI, createMcpServer, type McpContext } from './tools.js';

export { agentName, createMcpServer } from './tools.js';

/** A burst of writes (an import, a `git pull`) is one notification. */
const NOTIFY_MS = 250;

export interface McpEndpoint {
  /** Serve one request (already authenticated). */
  fetch: (request: Request) => Promise<Response>;
  close: () => Promise<void>;
}

export function mcpEndpoint(ctx: McpContext): McpEndpoint {
  const handler = createMcpHandler(({ era, requestInfo }) => createMcpServer(ctx, era, requestInfo?.headers.get('x-bragdoc-client')), {
    onerror: (e) => process.stderr.write(`bragdoc: [mcp] ${e.message}\n`),
    // security.ts already holds JSON bodies to 1 MB; this is the SDK's own bound, kept the same
    maxRequestBodySize: 1024 * 1024,
  });
  let timer: NodeJS.Timeout | undefined;
  const unsubscribe = ctx.store.subscribe(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = undefined;
      handler.notify.resourceUpdated(CONTEXT_URI);
    }, NOTIFY_MS);
    timer.unref?.();
  });
  return {
    fetch: (request) => handler.fetch(request),
    close: async () => {
      unsubscribe();
      clearTimeout(timer);
      await handler.close();
    },
  };
}
