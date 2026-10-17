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
  | { type: 'notices' }
  // the store (PR7 forwards every change to a data file, BragDoc's own or a hand edit, as its entity's type; D39)
  | { type: 'achievement' }
  | { type: 'evidence' }
  | { type: 'project' }
  | { type: 'repo' }
  | { type: 'company' }
  | { type: 'found' }
  | { type: 'profile' }
  /** The Problems list may have changed (sent with every store change). */
  | { type: 'problems' };

// ---------------------------------------------------------------- board (PR7): achievements, evidence, links, problems
//
// The data files' own types (Achievement, Evidence, Project, Repo, Problem, …) are in shared/schema/; these are the
// shapes the HTTP API wraps them in. Request bodies are the services' input schemas (shared/schema/inputs.ts):
// AchievementCreate for POST /api/achievements, AchievementUpdate for PATCH.

/** A stored evidence file, as a card needs it (from its sidecar). Keyed by sha256 in `AchievementView.files`. */
export interface EvidenceFile {
  sha256: string;
  mime: string;
  bytes: number;
  /** The name it was added with (display only). */
  name?: string;
  width?: number;
  height?: number;
  /** Text OCR read from it (PR11/PR15), when there is some. */
  ocrText?: string;
}

/**
 * An achievement as the API returns it: the file's front-matter and `body`, plus `etag` (send it back as `If-Match` on
 * PATCH/remove, so an edit made against a stale copy is a 409, not a silent overwrite) and `files`, the sidecars of the
 * evidence files it carries (a missing key: the file is gone from evidence/).
 *
 * The data-file fields are typed loosely here (shared/api.ts imports nothing); use `Achievement` from shared/schema/ for
 * the exact type: `AchievementView<Achievement>`.
 */
export type AchievementView<A = Record<string, unknown>> = A & {
  etag: string | null;
  files: Record<string, EvidenceFile>;
  /** The file on disk is broken right now: this is its last good copy, and edits are refused until it's fixed. */
  broken?: true;
  /** Written by a newer BragDoc: shown, never changed (D23). */
  readOnly?: true;
};

/**
 * `GET /api/achievements`: the board, a page of whole weeks at a time (weeks start on Monday), newest first.
 *
 * Query: `q` (full-text), `projectId`, `repoId`, `companyId`, `from` / `to` (YYYY-MM-DD, on `happenedAt`), `archived`
 * (`exclude` (default) | `include` | `only`), `source`, `minImpact`, `weeks` (how many weeks per page, default 8, at
 * most 104), `before` (a Monday: only weeks before it; pass the previous page's `nextBefore`).
 */
export interface AchievementsPage<A = Record<string, unknown>> {
  items: AchievementView<A>[];
  /** How many achievements match the filters in all, across every page. */
  total: number;
  /** The Monday to pass as `before` for the next (older) page; null when this is the last page. */
  nextBefore: string | null;
}

/** `POST /api/achievements`: 201 with the new one, or 200 with `created: false` when its externalKey is already on the board. */
export interface AchievementCreated<A = Record<string, unknown>> {
  achievement: AchievementView<A>;
  created: boolean;
}

/** `POST /api/achievements/:id/remove`: its file moved to backups/removed/ (undo: `POST …/restore`). */
export interface AchievementRemoved {
  removedTo: string;
}

/**
 * `POST /api/evidence`: a typed upload (the file's bytes as the body, its type as Content-Type, its name URI-encoded in
 * `X-Filename`). The type is checked against the bytes: a file that claims to be an image or a PDF and isn't is a 415
 * (`type_mismatch`), and so is a picture whose header is damaged (`damaged`). Over 25 MB: 413. Returns an Evidence item
 * (with a fresh id), not yet on any achievement: send it in `evidence` on create or update.
 */
export interface EvidenceUploaded<E = Record<string, unknown>> {
  evidence: E;
  file: EvidenceFile;
  /** False when these exact bytes were already stored. */
  created: boolean;
}

/** `POST /api/link-preview` body. */
export interface LinkPreviewRequest {
  url: string;
}

/**
 * What a pasted URL becomes. A GitHub PR gets its title only if a GitHub source is connected (PR13 registers it);
 * otherwise it's shown as `owner/repo#n`. Any other URL is never fetched: just its domain.
 */
export type LinkPreview =
  | {
      kind: 'github_pr';
      url: string;
      /** owner/repo */
      repo: string;
      number: number;
      externalKey: string;
      title?: string;
      /** Why there's no title: GitHub isn't connected, or asking it failed (the message says how). */
      titleNote?: string;
      /** The repo in repos/ with this remote, if there is one. */
      repoId?: string;
      /** Projects linked to that repo: the composer pre-selects them. */
      suggestedProjects: string[];
      /** An achievement that already carries this PR (adding it again returns that one). */
      onBoard?: string;
    }
  | { kind: 'url'; url: string; domain: string };

/** A project as the API lists it: the file's fields, its ETag (If-Match for edits) and how many achievements it has (archived included). */
export type ProjectEntry<P = Record<string, unknown>> = P & { etag: string; achievements: number };
/** A repo as the API lists it: the file's fields and its ETag. */
export type RepoEntry<R = Record<string, unknown>> = R & { etag: string };

/** `GET /api/projects` (server/routes/catalog.ts; PR8 adds the writes). Every project, newest start first. */
export interface ProjectsResponse<P = Record<string, unknown>> {
  projects: ProjectEntry<P>[];
}

/** `GET /api/repos` (server/routes/catalog.ts; PR8 adds the writes). Every repo, by name. */
export interface ReposResponse<R = Record<string, unknown>> {
  repos: RepoEntry<R>[];
}

/** `GET /api/problems`: everything wrong with files in the data home, errors first (SPEC R2). */
export interface ProblemsResponse<P = Record<string, unknown>> {
  problems: P[];
}

/** `GET /api/found/count`: how many candidates are waiting in Found (the board strip, the nav badge). */
export interface FoundCountResponse {
  pending: number;
}
