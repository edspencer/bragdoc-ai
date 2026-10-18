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
  /**
   * `fetch`: through BragDoc's own egress module. `gh`: a GitHub CLI run, whose traffic leaves outside BragDoc.
   * `ollama`: a download Ollama makes itself when asked to pull a model (v0.2), also outside BragDoc.
   */
  via: 'fetch' | 'gh' | 'ollama';
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
  /** AI calls (v0.2, SPEC R19): where it went, by host. */
  where?: AiWhere;
  /** AI calls: what for (`judge`, `tidy`, `draft`, `test`, `detect`, `pull`). */
  feature?: AiCallFeature;
  /** AI calls: which model, when there is one. */
  model?: string;
  /** AI calls: the request body's size in bytes (never its content); null when it couldn't be measured. */
  sent?: number | null;
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
  // the store (PR7 forwards every change to a data file, BragDoc's own or a hand edit, as its entity's type; D48)
  | { type: 'achievement' }
  | { type: 'evidence' }
  | { type: 'project' }
  | { type: 'repo' }
  | { type: 'company' }
  | { type: 'found' }
  | { type: 'profile' }
  /** A source's status changed: a check started or finished, it was connected or disconnected (PR13). */
  | { type: 'sources' }
  /** The Problems list may have changed (sent with every store change, and when a misnamed file comes or goes). */
  | { type: 'problems' }
  /** AI settings, a connection, a key or consent changed (PR21): refetch GET /api/ai. */
  | { type: 'ai' };

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

/** `GET /api/problems`: everything wrong with files in the data home, errors first (SPEC R2). */
export interface ProblemsResponse<P = Record<string, unknown>> {
  problems: P[];
}

/** `GET /api/found/count`: how many candidates are waiting in Found (the board strip, the nav badge). */
export interface FoundCountResponse {
  pending: number;
}

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
  sources: { github: { enabled: boolean; auth: 'gh' | 'token'; lookBackDays?: number; repos?: string[]; hourly?: boolean } };
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

// ---------------------------------------------------------------- Folio (PR14): GET /api/folio
// The window's achievements cut down to what a folio may show (D55): shared/folio.ts makes them (toClipping) and turns
// them into the document.

/** Evidence as a folio shows it: already safe to put in a document that leaves this machine. */
export type FolioEvidence =
  | { kind: 'github_pr'; ref: string; url?: string; title?: string }
  | { kind: 'url'; url?: string; domain?: string; title?: string }
  | { kind: 'quote'; text: string; from?: string; where?: string }
  | { kind: 'image' | 'pdf' | 'file'; name?: string };

/** One achievement, cut out for the folio. `id` is for the page's include/exclude only; it never reaches the document. */
export interface FolioItem {
  id: string;
  title: string;
  summary?: string;
  /** YYYY-MM-DD */
  happenedAt: string;
  endedAt?: string;
  impact?: number;
  /** Project ids, existing ones only (a dangling reference is dropped, as if it weren't there). */
  projects: string[];
  /** Its own company, else none (projects carry theirs). Existing companies only. */
  companyId?: string;
  evidence: FolioEvidence[];
}

export interface FolioProject {
  id: string;
  name: string;
  color: string;
  companyId: string | null;
}

export interface FolioCompany {
  id: string;
  name: string;
}

/** `GET /api/folio?from=YYYY-MM-DD&to=YYYY-MM-DD`: the window's achievements (archived ones left out), newest first. */
export interface FolioResponse {
  from: string;
  to: string;
  /** The profile's name, for the document's heading; null before onboarding. */
  author: string | null;
  items: FolioItem[];
  /** Every project and company (so a filter in the URL still has a name when nothing in the window uses it). */
  projects: FolioProject[];
  companies: FolioCompany[];
}

// ---------------------------------------------------------------- Found + sources (PR13)
//
// Found's candidates are the data files' type (FoundCandidate, shared/schema/found.ts), typed loosely here. Keep, merge
// and dismiss answer with the candidate as it is now; undo puts it back to pending. A dismissed candidate keeps only
// the hashes of its keys (D56), so the same PR or screenshot never comes back.

/** Where a candidate came from: the GitHub source, the screenshots folder (PR15), or an agent over MCP. */
export type FoundSourceName = 'github' | 'screenshots' | 'mcp';

/** `GET /api/found?source=`: the pending candidates, newest first, and how many are pending from each source. */
export interface FoundListResponse<F = Record<string, unknown>> {
  items: F[];
  /** Pending, whatever the `source` filter: for the filter row. */
  counts: Record<FoundSourceName | 'all', number>;
}

/** `POST /api/found/:id/merge` */
export interface FoundMergeRequest {
  achievementId: string;
}

/**
 * `POST /api/found/:id/{keep,merge,dismiss,undo}`. `achievementId`: the achievement keep made, or merge added to.
 * `missingFiles`: files the candidate pointed at that had gone, so weren't attached.
 */
export interface FoundDecided<F = Record<string, unknown>> {
  candidate: F;
  achievementId?: string;
  missingFiles?: string[];
}

/**
 * Why a GitHub check (or connecting) failed, in a word a program can switch on; the `message` says it for people.
 * `gh_missing`: no gh on PATH. `gh_logged_out`: gh isn't logged in. `token_missing`/`token_invalid`/`token_scope`: the
 * token isn't there, isn't accepted, or can't read pull requests. `rate_limited`: GitHub asked us to wait (`retryAt`).
 * `offline`: GitHub couldn't be reached. `failed`: anything else (the message has gh's or GitHub's own words).
 */
export type GithubErrorCode = 'gh_missing' | 'gh_logged_out' | 'token_missing' | 'token_invalid' | 'token_scope' | 'rate_limited' | 'offline' | 'failed';

export interface GithubError {
  code: GithubErrorCode;
  message: string;
  /** For `rate_limited`: when GitHub said it would answer again. */
  retryAt?: string;
}

/** One check of GitHub. */
export interface GithubRun {
  /** When it started and finished. */
  at: string;
  finishedAt: string;
  /** What it searched: merged on or after `from`, up to `to` (YYYY-MM-DD, UTC). */
  from: string;
  to: string;
  /** Merged pull requests GitHub returned, and how many of those were new to Found. */
  seen: number;
  added: number;
  /** Requests it made (gh runs or HTTP requests): each is one line in Network activity. */
  requests: number;
  /** Pull requests it couldn't add to Found (a file that couldn't be written): they're tried again next time. */
  skipped?: number;
  error?: GithubError;
}

/** The GitHub source, for its Settings card and Found's empty state. */
export interface GithubSourceStatus {
  enabled: boolean;
  auth: 'gh' | 'token';
  lookBackDays: number;
  /** Owners and owner/repo it looks in; empty: everywhere you merged (D57). */
  repos: string[];
  /** Checks every hour by itself while BragDoc runs. */
  hourly: boolean;
  /** The GitHub account it found when it connected (or last checked), if it knows. */
  login: string | null;
  /** A token is saved in secrets.yaml. */
  hasToken: boolean;
  /** A check is running right now. */
  running: boolean;
  /** The last check, or null if there hasn't been one. */
  lastRun: GithubRun | null;
  /** The next check will look from this date (YYYY-MM-DD); null before the first. */
  cursor: string | null;
  /** When the hourly check runs next, if it's on. */
  nextRunAt: string | null;
  /** GitHub asked BragDoc to wait until then (rate limited). */
  retryAt: string | null;
}

/** `GET /api/sources`: every source's state. */
export interface SourcesResponse {
  github: GithubSourceStatus;
  screenshots: ScreenshotsSourceStatus;
  /** Agents over MCP: always listening (with the token); `writeTo` says where their achievements go. */
  mcp: { writeTo: 'board' | 'found' };
}

/**
 * `GET /api/sources/github/gh`: is the GitHub CLI installed? Nothing is run and nothing leaves this computer: BragDoc
 * only looks for it on PATH. Whether it's logged in is checked when you connect with it (that is a request, and it's logged).
 */
export interface GhDetectResponse {
  installed: boolean;
}

/** `POST /api/sources/github/connect`: answers with the GithubSourceStatus (and runs the first check), or 400/409 `GithubError`. */
export type GithubConnectRequest = { auth: 'gh'; lookBackDays?: number; repos?: string[] } | { auth: 'token'; token: string; lookBackDays?: number; repos?: string[] };

/** `PUT /api/sources/github`: change its options. Answers with the GithubSourceStatus. */
export interface GithubSettingsRequest {
  lookBackDays?: number;
  repos?: string[];
  hourly?: boolean;
}

/** `POST /api/sources/github/disconnect`: switch it off; with `forgetToken`, the token in secrets.yaml is removed too. */
export interface GithubDisconnectRequest {
  forgetToken?: boolean;
}

// ---------------------------------------------------------------- the screenshots folder (PR15)
//
// A folder you pick is watched for new screenshots; each is read on this computer (OCR, no AI) and checked against the
// screenshot rules (shared/rules/screenshot.ts). Those that pass wait in Found; the rest are counted, and their text is
// never stored. Off until you turn it on.

/**
 * Why the folder can't be watched (or chosen), in a word a program can switch on; the `message` says it for people.
 * `missing`: there's nothing there (or it was deleted). `not_a_folder`: it's a file. `denied`: the system said no
 * (on macOS, the privacy permission for Desktop, Documents and Downloads). `not_allowed`: inside BragDoc's data folder
 * or a hidden folder. `not_set`: no folder chosen yet. `invalid`: a bad request. `busy`: a look back is already running.
 * `config_invalid`: config.yaml is broken, so nothing could be saved. `failed`: anything else.
 */
export type ScreenshotsErrorCode = 'missing' | 'not_a_folder' | 'denied' | 'not_allowed' | 'not_set' | 'invalid' | 'busy' | 'config_invalid' | 'failed';

export interface ScreenshotsError {
  code: ScreenshotsErrorCode;
  message: string;
}

/** What the source has done since it was first turned on (kept across restarts, in cache/sources/screenshots.json). */
export interface ScreenshotsCounts {
  /** Pictures it read. */
  looked: number;
  /** Of those, how many passed the rules and went to Found. */
  sent: number;
  /** Files it passed over without reading: not a picture, not named like a screenshot, too small or too big. */
  ignored: number;
  /** Pictures it couldn't read (damaged, a format OCR can't open). */
  failed: number;
}

/** The screenshots folder, for its Settings card and Found's empty state. */
export interface ScreenshotsSourceStatus {
  enabled: boolean;
  /** The folder as configured (`~/Screenshots`), or null if none is chosen. */
  folder: string | null;
  /** Only files named like screenshots. */
  onlyScreenshots: boolean;
  /** `off`; `watching`; `error` (see `error`: it looks again by itself every half minute). */
  state: 'off' | 'watching' | 'error';
  error: ScreenshotsError | null;
  /** Pictures waiting to be read, and the one being read now (its file name). */
  queued: number;
  reading: string | null;
  counts: ScreenshotsCounts;
  /** The last screenshot that went to Found. */
  lastMatch: { at: string; name: string } | null;
  /** The last file it passed over or read, and what became of it, in words ("not named like a screenshot"). */
  lastSeen: { at: string; name: string; outcome: string } | null;
  /** A look back over the last days that's running (or the last one, `running: false`). */
  lookBack: { running: boolean; days: number; total: number; done: number; at: string } | null;
  /** profile.yaml has no name yet, so no screenshot can pass the rules (they look for your name). */
  needsProfile: boolean;
  /** The server's platform (`darwin`, `linux`), for the card's advice about permissions. */
  platform: string;
}

/** A folder worth suggesting, and why. */
export interface ScreenshotsFolderSuggestion {
  /** As the user would write it (`~/Desktop`). */
  folder: string;
  why: string;
  exists: boolean;
  /** The macOS Desktop, Documents and Downloads are protected: watching one asks for permission. */
  protected: boolean;
}

/** `GET /api/sources/screenshots/suggestions`: where screenshots probably go on this computer, best first. */
export interface ScreenshotsSuggestionsResponse {
  platform: string;
  suggestions: ScreenshotsFolderSuggestion[];
}

/**
 * `PUT /api/sources/screenshots`: choose the folder, switch it on or off, or the name filter. A folder (or turning it on)
 * is checked first: a 400/409 `ScreenshotsError` says what's wrong, and nothing is saved. Answers with the status.
 */
export interface ScreenshotsSettingsRequest {
  enabled?: boolean;
  folder?: string;
  onlyScreenshots?: boolean;
}

/** `POST /api/sources/screenshots/look-back`: read the screenshots of the last `days` (1–30, default 7) once. */
export interface ScreenshotsLookBackRequest {
  days?: number;
}

/**
 * `GET /api/evidence/:sha/ocr`: the text read from a picture on the board, in the background after it's added.
 * `pending`: not read yet; `done`: read (`text`, and when the screenshot rules pass, the `quote` to offer as a sticky);
 * `failed`: it couldn't be read (`error`); `none`: not a picture.
 */
export interface EvidenceOcrResponse {
  status: 'pending' | 'done' | 'failed' | 'none';
  text?: string;
  engine?: string;
  error?: string;
  quote?: { text: string; from?: string; where?: string };
}

// ---------------------------------------------------------------- onboarding (PR16): welcome, profile, discover, example data

/**
 * `GET /api/welcome`: should the web app open Welcome? `firstRun` is true while there's no profile.yaml and Welcome
 * wasn't skipped (`welcome.skipped` in config.yaml, `POST /api/welcome/skip`). `legacyCli`: the old CLI's files were
 * moved into legacy-cli/, so the import offer is shown.
 */
export interface WelcomeResponse {
  firstRun: boolean;
  skipped: boolean;
  hasProfile: boolean;
  legacyCli: boolean;
  /** The data home, as people write it (`~/.bragdoc`). */
  dataDirDisplay: string;
}

/** `GET /api/profile`: profile.yaml (null before onboarding) and its ETag for `PUT /api/profile` (If-Match). */
export interface ProfileResponse<P = Record<string, unknown>> {
  profile: P | null;
  etag: string | null;
}

/** Why a folder can't be scanned. */
export type DiscoverErrorCode = 'no_such_folder' | 'not_a_folder' | 'unreadable' | 'too_broad' | 'not_absolute';

/** Other places that already know your recent projects, each read only when you tick it. */
export type DiscoverHintId = 'vscode' | 'jetbrains' | 'claude';

/** `GET /api/discover/suggestions`: which usual code folders exist, and which hint sources have something to read. */
export interface DiscoverSuggestions {
  home: string;
  folders: string[];
  hints: { id: DiscoverHintId; label: string; line: string; available: boolean }[];
}

/** `POST /api/discover/scan`: the folder you name (bounded: 4 levels, 5 s) and/or the hints you tick. Nothing is stored. */
export interface DiscoverScanRequest {
  root?: string | null;
  hints?: DiscoverHintId[];
}

export interface DiscoveredRepo {
  /** As people write it (`~/Code/my-app`). */
  path: string;
  name: string;
  remoteUrl: string | null;
  lastActivity: string | null;
  signal: 'push' | 'commit' | 'pull' | 'fetch' | 'checkout' | 'merge' | 'other' | null;
  /** In words: "you pushed 3 days ago". */
  why: string;
  via: ('folder' | DiscoverHintId)[];
  linked?: boolean;
  /** Already one of your repos. */
  known: boolean;
}

export interface DiscoverScanResponse {
  root: string | null;
  repos: DiscoveredRepo[];
  looked: number;
  unreadable: number;
  elapsedMs: number;
  /** The 5 s time box ran out: partial results. */
  timedOut: boolean;
  /** It stopped at 500 repos. */
  capped: boolean;
  emptyHints: DiscoverHintId[];
}

/** `POST /api/discover/add`: the repos you ticked, each optionally with a project (a new name, or an existing project's id). */
export interface DiscoverAddRequest {
  repos: { path: string; project?: { name: string } | { id: string } | null }[];
}

export interface DiscoverAddResponse {
  /** One per requested repo, in order: the repo (new or already there), or why it couldn't be added. */
  results: ({ path: string; repo: RepoEntry; created: boolean; projectId: string | null } | { path: string; error: string })[];
}

/** How many example entries there are (or were added or removed), by kind. */
export interface ExampleCounts {
  achievements: number;
  projects: number;
  companies: number;
  repos: number;
}

/** `GET /api/example`: is there example data (anything marked `example: true`)? */
export interface ExampleStatus {
  present: boolean;
  counts: ExampleCounts;
}

/** `POST /api/example`: add it (what isn't there yet). `asOf` places the dates (default today). */
export interface ExampleAddRequest {
  asOf?: string;
}

/** `POST /api/example` → what was added; `DELETE /api/example` → what was removed (+ files left alone). */
export interface ExampleChanged {
  changed: ExampleCounts;
  skipped?: string[];
  status: ExampleStatus;
}

// ---------------------------------------------------------------- AI (PR21)
//
// v0.2's opt-in AI (SPEC R17–R20). Settings live in config.yaml's `ai:` section but are served here, not in
// SettingsResponse, because they carry their own readiness and consent (D64). Keys are never returned: only `hasKey`
// and `keyHint` (the last four characters). The literal unions restate shared/ai/ (this file has no imports).

/** Where a call goes, by host (shared/ai/hosts.ts). */
export type AiWhere = 'this-computer' | 'your-network' | 'internet';
export type AiKindName = 'ollama' | 'lmstudio' | 'llamacpp' | 'openai-compatible' | 'anthropic' | 'openai' | 'openrouter' | 'jev';
export type AiFeatureName = 'judge' | 'tidy' | 'draft';
export type AiCallFeature = AiFeatureName | 'test' | 'detect' | 'pull';
/** Why something can't run now: the gates (all 409). */
export type AiGateCode = 'ai_off' | 'no_model' | 'not_consented' | 'no_key';
/** How a model call failed (server/ai/errors.ts). */
export type AiErrorCode =
  | 'unreachable'
  | 'model_missing'
  | 'key_refused'
  | 'quota'
  | 'rate_limited'
  | 'timeout'
  | 'no_structured_output'
  | 'bad_output'
  | 'context_too_long'
  | 'cancelled'
  | 'busy'
  | 'failed';

/** Which model on which connection. */
export interface AiSlot {
  connection: string;
  model: string;
}

export interface AiJudgeSettings {
  enabled: boolean;
  screenshots: boolean;
  github: boolean;
  model: AiSlot | null;
  when: { onArrival: boolean; everyHours: 1 | 3 | 6 | 12 | 24 | null; onlyBetween: { from: string; to: string } | null; onlyOnAC: boolean };
  backgroundCloud: boolean;
  maxPerRun: number;
}

export interface AiFeatureSettings {
  judge: AiJudgeSettings;
  tidy: { enabled: boolean; model: AiSlot | null };
  draft: { enabled: boolean; model: AiSlot | null };
}

/** One connection, as the API shows it. */
export interface AiConnectionView {
  id: string;
  kind: AiKindName;
  name: string | null;
  /** The address its requests go to (its own, or the kind's preset); null when it has none yet. */
  baseUrl: string | null;
  /** Its host, as the allow-list has it. */
  host: string | null;
  class: AiWhere;
  /** Needs consent before any request (its host is on the internet). */
  cloud: boolean;
  contextTokens: number;
  via: string | null;
  /** Stored consent, and whether it still covers this host and the statement shown today. */
  consent: { at: string; version: number; current: boolean } | null;
  /** The consent statement's version to accept (POST …/consent { version }). Null for a local connection. */
  consentVersion: number | null;
  needsKey: boolean;
  hasKey: boolean;
  /** `…abcd`: never the key. */
  keyHint: string | null;
  /** Why it can't be used right now, or null. */
  blocked: { code: AiGateCode; message: string } | null;
}

export interface AiFeatureReadiness {
  ready: boolean;
  /** Why not, when it isn't. */
  reason: AiGateCode | null;
  message: string | null;
  /** The model it would use. */
  slot: AiSlot | null;
  where: AiWhere | null;
}

/** `GET /api/ai` (and every AI write's answer). */
export interface AiStatus {
  enabled: boolean;
  text: AiSlot | null;
  connections: AiConnectionView[];
  features: AiFeatureSettings;
  readiness: Record<AiFeatureName, AiFeatureReadiness>;
  /** The hosts AI adds to the egress allow-list right now (none while AI is off). */
  egressHosts: string[];
  /** secrets.yaml can't be read: keys can't be used or saved until it's fixed by hand. */
  secretsProblem: string | null;
}

/** `PUT /api/ai`: the master switch and the text slot. */
export interface AiSettingsRequest {
  enabled?: boolean;
  text?: AiSlot | null;
}

/** `POST /api/ai/connections`. `id` defaults to the kind (`ollama`, then `ollama-2`…). */
export interface AiConnectionCreate {
  id?: string;
  kind: AiKindName;
  name?: string;
  baseUrl?: string;
  contextTokens?: number;
  via?: string;
}

/** `PUT /api/ai/connections/:id` (the kind can't change). A changed host clears consent. Null clears a field. */
export interface AiConnectionUpdate {
  name?: string | null;
  baseUrl?: string | null;
  contextTokens?: number | null;
  via?: string | null;
}

/** `PUT /api/ai/connections/:id/key`. */
export interface AiKeyRequest {
  key: string;
}

/** `POST /api/ai/connections/:id/consent`: the version of the statement the user was shown. */
export interface AiConsentRequest {
  version: number;
}

/** `POST /api/ai/connections/:id/test` (optional `{ model }`): one tiny structured request, logged like any call. */
export type AiTestResult =
  | { ok: true; model: string; where: AiWhere; ms: number; structured: boolean }
  | { ok: false; model: string | null; where: AiWhere | null; error: { code: AiErrorCode | AiGateCode; message: string } };

/** `GET /api/ai/connections/:id/models`. */
export interface AiModelsResponse {
  models: { name: string; sizeBytes: number | null }[];
}

/** `PUT /api/ai/features/:feature`: any of that feature's settings (a merge patch). */
export type AiFeatureUpdate = Partial<AiJudgeSettings> | Partial<AiFeatureSettings['tidy']>;
