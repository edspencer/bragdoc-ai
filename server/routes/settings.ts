// What Settings needs beyond /api/meta and /api/network-log (SPEC R13):
//   GET  /api/problems            the data home's Problems (Settings → Data), pushed live as a `problems` event
//   GET  /api/backups             the snapshots in backups/, newest first
//   GET  /api/settings            the config.yaml settings the pages show; PUT /api/settings/mcp edits mcp.writeTo
//   GET  /api/mcp/token           the MCP bearer token, for "Copy"; POST /api/mcp/token/rotate makes a new one
// The token is readable only by the app itself: the security guard refuses a foreign Host, and cross-site or
// same-site fetches to /api (Fetch Metadata, D26), and the response is no-store.
import path from 'node:path';
import type { Hono } from 'hono';
import { z } from 'zod';
import type { BackupsResponse, McpTokenResponse, ProblemsResponse, SettingsResponse } from '../../shared/api.js';
import { ConfigWriteError, type Config } from '../config.js';
import type { AppContext } from '../context.js';
import { homePaths } from '../home.js';
import { apiError } from '../http.js';
import { tildify } from '../paths.js';
import { KEEP_DAYS, KEEP_RECENT, listSnapshots } from '../store/backups.js';

const McpSettings = z.strictObject({ writeTo: z.enum(['board', 'found']) });

/** A snapshot's name (`2026-10-17T09-30-00Z`, `…Z-2`) as an ISO time. */
export function snapshotTime(name: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z/.exec(name);
  return m ? `${m[1]}T${m[2]}:${m[3]}:${m[4]}Z` : name;
}

const settingsOf = (c: Config): SettingsResponse => ({
  mcp: { writeTo: c.mcp.writeTo },
  sources: { github: { enabled: c.sources.github.enabled, auth: c.sources.github.auth } },
});

export function registerSettings(app: Hono, ctx: AppContext): void {
  // Problems can change with any file (a fix, a break, a deletion that leaves a reference dangling) and with a misnamed
  // file arriving. Pushed only when the list really changed, after a burst settles (a `git pull` is many changes).
  let last = JSON.stringify(ctx.store.problems());
  let timer: NodeJS.Timeout | null = null;
  ctx.store.subscribeProblems(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const now = JSON.stringify(ctx.store.problems());
      if (now === last) return;
      last = now;
      ctx.bus.emit({ type: 'problems' });
    }, 150);
    timer.unref?.();
  });

  app.get('/api/problems', (c) => c.json({ problems: ctx.store.problems() } satisfies ProblemsResponse));

  app.get('/api/backups', (c) => {
    const dir = homePaths(ctx.dataDir).backups;
    const snapshots = listSnapshots(dir)
      .reverse()
      .map((name) => ({ name, at: snapshotTime(name) }));
    return c.json({ dirDisplay: tildify(path.resolve(dir)), snapshots, keepRecent: KEEP_RECENT, keepDays: KEEP_DAYS } satisfies BackupsResponse);
  });

  app.get('/api/settings', (c) => c.json(settingsOf(ctx.config.get())));

  app.put('/api/settings/mcp', async (c) => {
    const body = McpSettings.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) return c.json(apiError('invalid', 'send { "writeTo": "board" } or { "writeTo": "found" }'), 400);
    try {
      return c.json(settingsOf(ctx.config.update({ mcp: { writeTo: body.data.writeTo } })));
    } catch (e) {
      if (e instanceof ConfigWriteError) return c.json(apiError('config_invalid', e.message), 409);
      throw e;
    }
  });

  const tokenResponse = (url: string, token: string): McpTokenResponse => ({ token, url: `${url}/mcp` });
  const base = (reqUrl: string) => ctx.runtime.url() ?? new URL(reqUrl).origin;

  app.get('/api/mcp/token', (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json(tokenResponse(base(c.req.url), ctx.runtime.mcpToken()));
  });

  app.post('/api/mcp/token/rotate', (c) => {
    const token = ctx.runtime.rotate(); // written to runtime.json at once: the old token fails from the next request
    ctx.bus.emit({ type: 'mcp-token' });
    c.header('Cache-Control', 'no-store');
    return c.json(tokenResponse(base(c.req.url), token));
  });
}
