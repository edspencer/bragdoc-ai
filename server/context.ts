// What every route module gets: the one object createApp() builds and hands to registerRoutes() (routes/index.ts).
// Later PRs add what their routes need (the store, the event bus, config) as new fields here, in their own lines, so
// parallel PRs rebase cleanly. Keep it a plain bag of dependencies: no logic.

export interface AppContext {
  /** The package version (paths.ts). */
  version: string;
  /** The data home, absolute (paths.ts resolveDataDir). Nothing creates it yet: that's server/home.ts (PR2). */
  dataDir: string;
}
