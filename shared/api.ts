// Types shared by the server (server/) and the web app (src/). Keep this file free of imports and of anything that
// needs Node or the DOM: it's compiled by both tsconfigs.
//
// This is the HTTP API's contract. The web app builds against it, so change an existing type only by adding optional
// fields. Each feature PR adds its own request/response types here, in a section of its own. Times are ISO 8601
// strings; paths are absolute unless the field says otherwise. Data-file schemas (achievements, projects, …) live
// in shared/schema/ (PR3), not here.

/** `GET /api/health`: the server is up, and which version it is. */
export interface HealthResponse {
  ok: true;
  version: string;
}

/**
 * The body of every API error (any 4xx/5xx from `/api/*`). `code` is stable and machine-readable (`not_found`,
 * `invalid`, …); `message` is a sentence for people.
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// ---------------------------------------------------------------- platform (PR2): meta, notices, network log, events

/**
 * Something the user should know that isn't an error in one request: the old CLI's files were moved aside, config.yaml
 * doesn't validate, … `id` is stable for a given situation, so the web app can remember a dismissal.
 */
export interface Notice {
  id: string;
  level: 'info' | 'warning';
  message: string;
}

/** `GET /api/meta`: what this server is and how it's set up. */
export interface MetaResponse {
  version: string;
  /** dist/build-info.json from the release build (PR6), or null for a build from source. Never a "verified" claim. */
  build: Record<string, unknown> | null;
  /** The data home, absolute, and as people write it (`~/.bragdoc`). */
  dataDir: string;
  dataDirDisplay: string;
  notices: Notice[];
  /** Where MCP clients connect (the endpoint itself arrives with PR9). */
  mcpUrl: string;
  /** Hostnames the Host check accepts besides loopback (config.yaml allowedHosts + BRAGDOC_ALLOWED_HOSTS). */
  allowedHosts: string[];
  /** Hosts outbound requests may go to right now, derived from what's connected (SPEC R4). */
  egressAllowList: string[];
}

/** One outbound request (or one `gh` run) in logs/network.jsonl. */
export interface NetworkLogEntry {
  /** When it started. */
  at: string;
  /** Why BragDoc made it, e.g. `github.pulls`. */
  purpose: string;
  /** `fetch`: through BragDoc's own egress module. `gh`: a GitHub CLI run, whose traffic leaves outside BragDoc. */
  via: 'fetch' | 'gh';
  method: string;
  host: string;
  /** The path only: never the query string, which can carry secrets. For `gh`, the subcommand. */
  path: string;
  outcome: 'ok' | 'denied' | 'error';
  /** The HTTP status (fetch), or the exit code (gh); null if there wasn't one. */
  status: number | null;
  /** The response's size, when it said; null if unknown. */
  bytes: number | null;
  /** Why it was denied or failed. */
  error?: string;
}

/** `GET /api/network-log?limit=&offset=`: newest first. */
export interface NetworkLogResponse {
  entries: NetworkLogEntry[];
  /** How many entries the log holds in all (for paging). */
  total: number;
}

/**
 * What `GET /api/events` pushes as `change` events: each names something that changed, and the web app refetches what
 * depends on it. Feature PRs add their own members to this union, one line each.
 */
export type ServerEvent =
  | { type: 'config' }
  | { type: 'network' }
  | { type: 'notices' };
