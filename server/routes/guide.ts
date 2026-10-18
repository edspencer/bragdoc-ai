// GET /agent-guide.md, /llms.txt, /llms-full.txt (SPEC R11): the agent guide with this server's live facts. Outside
// /api because that's where agents look for llms.txt. Read-only, and nothing the app doesn't already show to this
// computer (the Host and Origin checks apply as everywhere). Adapted from Hallway's agentRoutes (server/api.ts).
import type { Context, Hono } from 'hono';
import type { AppContext } from '../context.js';
import { agentGuide, llmsFullTxt, llmsTxt, readGuide, type GuideInput } from '../guide.js';
import { tildify } from '../paths.js';

/**
 * The address the agent came in on, so every URL in the guide works from where it is: the Host header (security.ts has
 * already checked it's one we answer to), https when a TLS-terminating proxy says so. It's only text in a document.
 */
function baseUrl(c: Context): string {
  const u = new URL(c.req.url);
  const proto = /^\s*https\s*(,|$)/i.test(c.req.header('x-forwarded-proto') ?? '') ? 'https:' : u.protocol;
  return `${proto}//${c.req.header('host') ?? u.host}`;
}

export function registerGuide(app: Hono, ctx: AppContext): void {
  const input = (c: Context): GuideInput => {
    const { store } = ctx;
    return {
      guide: readGuide(),
      url: baseUrl(c),
      live: {
        version: ctx.version,
        home: tildify(ctx.dataDir),
        writeTo: ctx.config.get().mcp.writeTo,
        achievements: store.all('achievement').filter((a) => !a.archived).length,
        projects: store
          .all('project')
          .filter((p) => p.status === 'active' || p.status === 'paused')
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((p) => ({ id: p.id, name: p.name })),
        repos: store.all('repo').filter((r) => r.tracked).length,
      },
    };
  };
  const text = (c: Context, body: string, type: string) => {
    c.header('Cache-Control', 'no-store');
    return c.body(body, 200, { 'Content-Type': `${type}; charset=utf-8` });
  };
  app.get('/llms.txt', (c) => text(c, llmsTxt(input(c)), 'text/plain'));
  app.get('/llms-full.txt', (c) => text(c, llmsFullTxt(input(c)), 'text/plain'));
  app.get('/agent-guide.md', (c) => text(c, agentGuide(input(c)), 'text/markdown'));
}
