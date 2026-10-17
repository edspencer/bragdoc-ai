// Every HTTP route, registered on the root app by createApp() (server/index.ts) before the SPA fallback.
//
// How to add routes (one module per feature, so parallel PRs don't collide; D18):
//   1. Write server/routes/<feature>.ts exporting `register<Feature>(app: Hono, ctx: AppContext): void`, which
//      registers full paths (`app.get('/api/things', …)`). API routes live under /api; the few that don't (/mcp,
//      /agent-guide.md, /llms.txt) say why in their module.
//   2. Import it below and add ONE line to registerRoutes. Keep the lines alphabetical by feature, which spreads
//      parallel PRs' additions out and keeps rebase conflicts to a line each.
//   3. Put its request/response types in shared/api.ts, and anything new it needs from the server in AppContext
//      (server/context.ts).
// Unknown /api/* paths get a JSON 404 (index.ts), never the web app's HTML.
import type { Hono } from 'hono';
import type { AppContext } from '../context.js';
import { registerCatalog } from './catalog.js';
import { registerCompanies } from './companies.js';
import { registerEvents } from './events.js';
import { registerGuide } from './guide.js';
import { registerHealth } from './health.js';
import { registerMcp } from './mcp.js';
import { registerMeta } from './meta.js';
import { registerNetwork } from './network.js';
import { registerProjects } from './projects.js';
import { registerRepos } from './repos.js';

export function registerRoutes(app: Hono, ctx: AppContext): void {
  registerCatalog(app, ctx);
  registerCompanies(app, ctx);
  registerEvents(app, ctx);
  registerGuide(app, ctx);
  registerHealth(app, ctx);
  registerMcp(app, ctx);
  registerMeta(app, ctx);
  registerNetwork(app, ctx);
  registerProjects(app, ctx);
  registerRepos(app, ctx);
}
