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
import { registerAchievements } from './achievements.js';
import { registerAi } from './ai.js';
import { registerAiActivity } from './ai-activity.js';
import { registerAiInstructions } from './ai-instructions.js';
import { registerAiLocal } from './ai-local.js';
import { registerAiTidy } from './ai-tidy.js';
import { registerCatalog } from './catalog.js';
import { registerCompanies } from './companies.js';
import { registerDiscover } from './discover.js';
import { registerEvents } from './events.js';
import { registerEvidence } from './evidence.js';
import { registerExample } from './example.js';
import { registerFolio } from './folio.js';
import { registerFound } from './found.js';
import { registerFoundCount } from './found-count.js';
import { registerGuide } from './guide.js';
import { registerHealth } from './health.js';
import { registerImport } from './import.js';
import { registerLinkPreview } from './link-preview.js';
import { registerMcp } from './mcp.js';
import { registerMeta } from './meta.js';
import { registerNetwork } from './network.js';
import { registerProblems } from './problems.js';
import { registerProjects } from './projects.js';
import { registerRepos } from './repos.js';
import { registerSettings } from './settings.js';
import { registerSources } from './sources.js';
import { registerWelcome } from './welcome.js';

export function registerRoutes(app: Hono, ctx: AppContext): void {
  registerAchievements(app, ctx);
  registerAi(app, ctx);
  registerAiActivity(app, ctx);
  registerAiInstructions(app, ctx);
  registerAiLocal(app, ctx);
  registerAiTidy(app, ctx);
  registerCatalog(app, ctx);
  registerCompanies(app, ctx);
  registerDiscover(app, ctx);
  registerEvents(app, ctx);
  registerEvidence(app, ctx);
  registerExample(app, ctx);
  registerFolio(app, ctx);
  registerFound(app, ctx);
  registerFoundCount(app, ctx);
  registerGuide(app, ctx);
  registerHealth(app, ctx);
  registerImport(app, ctx);
  registerLinkPreview(app, ctx);
  registerMcp(app, ctx);
  registerMeta(app, ctx);
  registerNetwork(app, ctx);
  registerProblems(app, ctx);
  registerProjects(app, ctx);
  registerRepos(app, ctx);
  registerSettings(app, ctx);
  registerSources(app, ctx);
  registerWelcome(app, ctx);
}
