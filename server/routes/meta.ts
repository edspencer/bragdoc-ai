// GET /api/meta: what this server is and how it's set up, for Settings (Data, About & verify, Network activity) and
// for anything that needs the MCP address.
import fs from 'node:fs';
import path from 'node:path';
import type { Hono } from 'hono';
import type { BuildInfo, MetaResponse } from '../../shared/api.js';
import type { AppContext } from '../context.js';
import { PACKAGE_ROOT, tildify } from '../paths.js';

const nullableString = (v: unknown) => v === null || typeof v === 'string';

/** Is `v` the shape scripts/build-info.mjs writes? A file that isn't is reported as no build info, not passed on. */
export function isBuildInfo(v: unknown): v is BuildInfo {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const b = v as Record<string, unknown>;
  return (
    typeof b.name === 'string' &&
    typeof b.version === 'string' &&
    nullableString(b.commit) &&
    typeof b.builtAt === 'string' &&
    nullableString(b.runUrl) &&
    typeof b.official === 'boolean'
  );
}

/** dist/build-info.json, which every build writes (scripts/build-info.mjs). Read on each request: it's small, and rarely asked. */
export function readBuildInfo(file = path.join(PACKAGE_ROOT, 'dist', 'build-info.json')): BuildInfo | null {
  try {
    const v: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    return isBuildInfo(v) ? v : null;
  } catch {
    return null;
  }
}

export function registerMeta(app: Hono, ctx: AppContext): void {
  app.get('/api/meta', (c) => {
    const base = ctx.runtime.url() ?? new URL(c.req.url).origin;
    return c.json({
      version: ctx.version,
      build: readBuildInfo(),
      dataDir: ctx.dataDir,
      dataDirDisplay: tildify(ctx.dataDir),
      notices: ctx.notices(),
      mcpUrl: `${base}/mcp`,
      allowedHosts: ctx.config.allowedHosts(),
      egressAllowList: ctx.egress.allowList(),
    } satisfies MetaResponse);
  });
}
