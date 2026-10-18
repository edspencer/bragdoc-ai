// The sources that fill Found by themselves (SPEC R7, D15): GitHub (PR13) and a screenshots folder (PR15). Agents
// over MCP are the third, but they need nothing here: they call `bragdoc_add_found` (server/mcp/tools.ts).
//
// Adding a source: a module in this folder that adds candidates with `ctx.services.found.add()` (keyed, so a candidate
// is never added twice and a dismissed one never comes back), a field on `Sources`, its part of `start()` if it runs
// in the background, its status in `GET /api/sources` (server/routes/sources.ts) and its Settings card.
import type { AppContext } from '../context.js';
import { GithubSource } from './github.js';
import { ScreenshotsSource } from './screenshots.js';

export interface Sources {
  github: GithubSource;
  screenshots: ScreenshotsSource;
  /** Start what runs in the background (startServer does, never createApp, so tests start nothing). Returns a stop function. */
  start: () => () => void;
}

export function createSources(ctx: Omit<AppContext, 'sources'>, { env, now, homedir }: { env?: NodeJS.ProcessEnv; now?: () => Date; homedir?: string } = {}): Sources {
  const github = new GithubSource({ dataDir: ctx.dataDir, config: ctx.config, egress: ctx.egress, secrets: ctx.secrets, store: ctx.store, services: ctx.services, bus: ctx.bus, linkPreviews: ctx.linkPreviews, env, now });
  const screenshots = new ScreenshotsSource({ dataDir: ctx.dataDir, config: ctx.config, store: ctx.store, services: ctx.services, bus: ctx.bus, ocr: ctx.ocr, env, now, homedir });
  return {
    github,
    screenshots,
    start: () => {
      const stops = [github.start(), screenshots.start()];
      return () => stops.forEach((s) => s());
    },
  };
}
