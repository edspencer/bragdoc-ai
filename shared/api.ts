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

/**
 * What a build says about itself: dist/build-info.json, written by scripts/build-info.mjs at the end of every
 * `npm run build` (so the npm package and the Docker image both have one). It's a claim, not a proof: anyone can write
 * this file, so the app never calls a build "verified"; About → Verify this build shows it next to the commands that
 * check it independently (`npm audit signatures`, `gh attestation verify`).
 */
export interface BuildInfo {
  /** The package name and version it was built as. */
  name: string;
  version: string;
  /** The git commit it was built from, or null if unknown (a build from a tarball of the sources). */
  commit: string | null;
  /** ISO 8601. A release sets it to the commit's time (SOURCE_DATE_EPOCH), so rebuilding one commit says the same. */
  builtAt: string;
  /** The GitHub Actions run that built it, or null. */
  runUrl: string | null;
  /** True only for a build by the release workflow; every other build is an "unofficial build". */
  official: boolean;
}

/** `GET /api/meta`: what this server is and how it's set up. */
export interface MetaResponse {
  version: string;
  /** dist/build-info.json, or null when there isn't one (running from source) or it isn't readable. */
  build: BuildInfo | null;
  /** The data home, absolute, and as people write it (`~/.bragdoc`). */
  dataDir: string;
  dataDirDisplay: string;
  notices: Notice[];
  /** Where MCP clients connect (Streamable HTTP; needs the bearer token from runtime.json). */
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
  | { type: 'mcp-token' }
  | { type: 'network' }
  | { type: 'notices' }
  | { type: 'problems' }
  | { type: 'project' }
  | { type: 'company' }
  | { type: 'repo' };

// ---------------------------------------------------------------- settings (PR10): problems, backups, MCP, guard check

/**
 * A problem with a file in the data home (Settings → Data): the store's `Problem` (shared/schema/problem.ts), restated
 * here so this file stays import-free. `file` is relative to the data home, with `/`.
 */
export interface FileProblem {
  severity: 'error' | 'warning';
  code: 'syntax' | 'invalid' | 'future-version' | 'dangling' | 'stray';
  file: string;
  line?: number;
  col?: number;
  key?: string;
  message: string;
}

/** `GET /api/problems`: errors first. Live: a `problems` event when the list may have changed. */
export interface ProblemsResponse {
  problems: FileProblem[];
}

/** One snapshot in `backups/`. */
export interface BackupSnapshot {
  /** The directory's name (`2026-10-17T09-30-00Z`), relative to `backups/`. */
  name: string;
  /** When it was taken (ISO 8601), from its name. */
  at: string;
}

/** `GET /api/backups`: newest first. */
export interface BackupsResponse {
  /** `backups/`, as people write it (`~/.bragdoc/backups`). */
  dirDisplay: string;
  snapshots: BackupSnapshot[];
  /** The retention rule, in numbers: the newest `keepRecent`, plus one a day for `keepDays` days. */
  keepRecent: number;
  keepDays: number;
}

/** `GET /api/settings`: the settings the Settings pages edit or show (config.yaml, live: a `config` event). */
export interface SettingsResponse {
  mcp: { writeTo: 'board' | 'found' };
  sources: { github: { enabled: boolean; auth: 'gh' | 'token' } };
}

/** `PUT /api/settings/mcp`: where MCP agents' achievements go. Answers with the new SettingsResponse. */
export interface McpSettingsRequest {
  writeTo: 'board' | 'found';
}

/** `GET /api/mcp/token` and `POST /api/mcp/token/rotate`: the MCP bearer token (rotating ends the old one at once). */
export interface McpTokenResponse {
  token: string;
  /** Where MCP clients connect. */
  url: string;
}

/**
 * `POST /api/network-log/guard-check`: ask the egress module for a request to a host that isn't on the allow-list (a
 * `.invalid` name, which can never resolve anyway). It's refused before anything is sent, and the refusal is logged
 * like any other, so the receipt shows it. `refused: false` would mean the guard is broken.
 */
export interface GuardCheckResponse {
  refused: boolean;
  host: string;
  message: string;
}

// ---------------------------------------------------------------- projects, companies, repos (PR8)
// The entities themselves are the data files' types (shared/schema/project.ts, …), restated loosely here because this
// file imports nothing. Every one carries its file's `etag`: send it back as `If-Match` on PATCH and DELETE, and an
// edit made against a stale copy is a 409 instead of a silent overwrite.

export type ProjectStatus = 'active' | 'paused' | 'done' | 'archived';

export interface ProjectEntry {
  id: string;
  name: string;
  description?: string;
  /** `#rrggbb`: any colour. */
  color: string;
  /** YYYY-MM-DD */
  start: string;
  /** YYYY-MM-DD, or null while it's ongoing. */
  end: string | null;
  status: ProjectStatus;
  companyId: string | null;
  repoIds: string[];
  example?: boolean;
  etag: string;
  /** How many achievements (archived ones included) are tagged with it. */
  achievements: number;
}

export interface CompanyEntry {
  id: string;
  name: string;
  role?: string;
  start?: string;
  end: string | null;
  example?: boolean;
  etag: string;
}

export interface RepoEntry {
  id: string;
  name: string;
  /** As the user writes it (`~/Code/my-app`). */
  localPath?: string;
  remoteUrl?: string;
  /** `github.com`, …, or `local`. */
  host: string;
  tracked: boolean;
  example?: boolean;
  etag: string;
}

/** `GET /api/projects`: every project, newest start first. */
export interface ProjectsResponse {
  projects: ProjectEntry[];
}
/** `GET /api/companies` */
export interface CompaniesResponse {
  companies: CompanyEntry[];
}
/** `GET /api/repos` */
export interface ReposResponse {
  repos: RepoEntry[];
}

/** `POST /api/repos`: the repo, and whether it's new (false: one with the same folder or remote was already there). */
export interface RepoCreateResponse {
  repo: RepoEntry;
  created: boolean;
}

/** `POST /api/projects/:id/repos`: link and/or unlink repos (ids). Returns the project (a ProjectEntry). */
export interface ProjectReposRequest {
  link?: string[];
  unlink?: string[];
}

/** What a delete took the deleted thing off, so undo can put it back (ids). */
export interface Detached {
  achievements: string[];
  projects: string[];
}

/**
 * `DELETE /api/projects/:id` (and companies, repos): the file goes to backups/removed/, and references to it are
 * taken off the files that had them (D45). Undo: `POST /api/<things>/:id/restore` with `{ reattach: detached }`.
 */
export interface DeleteResponse {
  removedTo: string;
  detached: Detached;
}

/** `POST /api/<things>/:id/restore` */
export interface RestoreRequest {
  reattach?: Partial<Detached>;
}

/** One achievement in a project's pile, as the Projects page draws it. */
export interface PileItem {
  id: string;
  title: string;
  summary?: string;
  happenedAt: string;
  impact?: number;
  archived: boolean;
  /** Evidence on it, by kind (`image`, `pdf`, `file`, `url`, `github_pr`, `quote`). */
  evidence: Record<string, number>;
}

/** `GET /api/projects/:id/summary`: a project's pile (its achievements, newest first) and its counts. */
export interface ProjectSummary {
  project: ProjectEntry;
  company: CompanyEntry | null;
  repos: RepoEntry[];
  /** Achievements tagged with it, archived ones excluded. */
  achievements: number;
  /** Evidence across those achievements, in all and by kind. */
  evidence: { total: number; byKind: Record<string, number> };
  /** The first and last achievement dates, or null with none. */
  firstAt: string | null;
  lastAt: string | null;
  /** Newest first, at most `PILE_LIMIT`. */
  pile: PileItem[];
}

/** How many achievements a project summary lists. */
export const PILE_LIMIT = 200;

// ---------------------------------------------------------------- importer (PR12): POST /api/import/{plan,apply}

/** What an import brings across, by kind. Documents and reviews become files under `imports/<timestamp>/`. */
export type ImportKind = 'companies' | 'projects' | 'repos' | 'achievements' | 'documents' | 'reviews';

export interface ImportCount {
  /** New: created (or, in a dry run, would be). */
  add: number;
  /** Already here (an earlier import of the same export), or a repeat within the file: left alone. */
  skip: number;
  /** Couldn't be imported (see `problems`, level `error`). */
  fail: number;
}

/** A field in the export that has no place in BragDoc, and why. Counted over the items that had a value for it. */
export interface ImportDropped {
  /** `achievements[].embedding`, `userId`, … */
  field: string;
  count: number;
  why: string;
}

export interface ImportProblem {
  /** `error`: the item wasn't imported. `warning`: it was, with the change the message describes. */
  level: 'error' | 'warning';
  kind: ImportKind;
  /** Which item, for people: `"Shipped the importer" (id 3f2a…)`, or `#12` when it has no usable name. */
  item: string;
  message: string;
}

/**
 * The answer to POST /api/import/plan (a dry run: nothing written) and /api/import/apply (done). Both take the export
 * file itself as the JSON body, up to 50 MB. A file that can't be imported at all is a 400 (`invalid_export`, or
 * `unsupported_version` for anything but version "1.0"); an import already running is a 409 (`import_running`).
 */
export interface ImportReport {
  dryRun: boolean;
  /** When the export was made, if it says. */
  exportedAt: string | null;
  counts: Record<ImportKind, ImportCount>;
  dropped: ImportDropped[];
  /** Errors first. */
  problems: ImportProblem[];
  /** Where documents and reviews go (relative to the data home, `imports/<timestamp>`), or null if there are none. */
  importsDir: string | null;
  /** The snapshot taken before importing (`backups/<name>`); null in a dry run, or when there was nothing to snapshot. */
  snapshot: string | null;
}
