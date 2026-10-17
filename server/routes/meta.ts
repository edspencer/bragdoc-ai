// GET /api/meta: what this server is and how it's set up, for Settings (Data, About & verify, Network activity) and
// for anything that needs the MCP address.
import fs from 'node:fs';
import path from 'node:path';
import type { Hono } from 'hono';
import type { MetaResponse } from '../../shared/api.js';
import type { AppContext } from '../context.js';
import { PACKAGE_ROOT, tildify } from '../paths.js';

/** dist/build-info.json, which only a release build has (PR6). Read on each request: it's small, and rarely asked. */
function buildInfo(): Record<string, unknown> | null {
  try {
    const v = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'dist', 'build-info.json'), 'utf8'));
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export function registerMeta(app: Hono, ctx: AppContext): void {
  app.get('/api/meta', (c) => {
    const base = ctx.runtime.url() ?? new URL(c.req.url).origin;
    return c.json({
      version: ctx.version,
      build: buildInfo(),
      dataDir: ctx.dataDir,
      dataDirDisplay: tildify(ctx.dataDir),
      notices: ctx.notices(),
      mcpUrl: `${base}/mcp`,
      allowedHosts: ctx.config.allowedHosts(),
      egressAllowList: ctx.egress.allowList(),
    } satisfies MetaResponse);
  });
}
