// What every route module gets: the one object createApp() builds and hands to registerRoutes() (routes/index.ts).
// Later PRs add what their routes need (the store, the event bus, config) as new fields here, in their own lines, so
// parallel PRs rebase cleanly. Keep it a plain bag of dependencies: no logic.
import type { Services } from './services/index.js';
import type { Store } from './store/index.js';

export interface AppContext {
  /** The package version (paths.ts). */
  version: string;
  /** The data home, absolute (paths.ts resolveDataDir). Nothing creates it yet: that's server/home.ts (PR2). */
  dataDir: string;
  /** The data home's files and their in-memory index (server/store/). Routes read from it; they write through `services`. */
  store: Store;
  /** The operations routes and MCP both call: achievements, projects, companies, repos, evidence, found, profile. */
  services: Services;
}
