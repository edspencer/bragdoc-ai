// What every route module gets: the one object createApp() builds and hands to registerRoutes() (routes/index.ts).
// Later PRs add what their routes need as new fields here, in their own lines, so parallel PRs rebase cleanly. Keep
// it a plain bag of dependencies: no logic.
import type { Notice } from '../shared/api.js';
import type { ConfigStore } from './config.js';
import type { Egress } from './egress.js';
import type { EventBus } from './events.js';
import type { LinkPreviews } from './link-preview.js';
import type { Runtime } from './runtime.js';
import type { UploadRegistry } from './security.js';
import type { Services } from './services/index.js';
import type { Store } from './store/index.js';

export interface AppContext {
  /** The package version (paths.ts). */
  version: string;
  /** The data home, absolute (paths.ts resolveDataDir); laid out by home.ts when the server starts. */
  dataDir: string;
  /** config.yaml, live: `ctx.config.get()` re-reads it when it changed. */
  config: ConfigStore;
  /** The event bus behind GET /api/events: emit a ServerEvent when something the web app shows changed. */
  bus: EventBus;
  /** The only way to make an outbound request: `ctx.egress.egressFetch({ purpose }, url, init)` (SPEC R4). */
  egress: Egress;
  /** runtime.json: the MCP token (`ctx.runtime.mcpToken()`, `rotate()`) and where this server listens. */
  runtime: Runtime;
  /** Routes that take a typed upload instead of JSON opt in here, from their register function (security.ts). */
  uploads: UploadRegistry;
  /** Everything the user should be told about right now (the legacy move-aside, a broken config.yaml, …). */
  notices: () => Notice[];
  /** The data home's files and their in-memory index (server/store/). Routes read from it; they write through `services`. */
  store: Store;
  /** The operations routes and MCP both call: achievements, projects, companies, repos, evidence, found, profile. */
  services: Services;
  /** POST /api/link-preview's GitHub lookup: unset until a GitHub source registers one (`setGithub`, PR13). */
  linkPreviews: LinkPreviews;
}
