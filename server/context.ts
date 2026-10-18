// What every route module gets: the one object createApp() builds and hands to registerRoutes() (routes/index.ts).
// Later PRs add what their routes need as new fields here, in their own lines, so parallel PRs rebase cleanly. Keep
// it a plain bag of dependencies: no logic.
import type { Notice } from '../shared/api.js';
import type { AiActivity } from './ai/activity.js';
import type { Ai } from './ai/run.js';
import type { ConfigStore } from './config.js';
import type { Egress } from './egress.js';
import type { EventBus } from './events.js';
import type { LinkPreviews } from './link-preview.js';
import type { EvidenceText } from './ocr/evidence-text.js';
import type { Ocr } from './ocr/index.js';
import type { Runtime } from './runtime.js';
import type { Secrets } from './secrets.js';
import type { UploadRegistry } from './security.js';
import type { Services } from './services/index.js';
import type { Sources } from './sources/index.js';
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
  /** secrets.yaml (0600): the GitHub token, when GitHub is connected with one. */
  secrets: Secrets;
  /** The sources that fill Found by themselves: `ctx.sources.github` (PR13) and `ctx.sources.screenshots` (PR15). */
  sources: Sources;
  /** OCR, one read at a time for everything (the screenshots folder and the board's pictures); evidence text in sidecars. */
  ocr: Ocr;
  /** The board's pictures, read in the background (started by startServer): `status(sha)` for GET /api/evidence/:sha/ocr. */
  evidenceText: EvidenceText;
  /** Every model call (v0.2): `ctx.ai.object/stream/test/models`, gated, queued, through egress. Loads no SDK until used. */
  ai: Ai;
  /** The AI activity log (logs/ai-runs.jsonl): every ctx.ai call lands here; `start()` groups a feature's run (PR22). */
  aiActivity: AiActivity;
}
