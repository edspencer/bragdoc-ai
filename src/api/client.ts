// The web app's side of the HTTP API (types in shared/api.ts). One small wrapper, `api`, does every request: JSON in,
// JSON out, and any failure becomes an ApiRequestError carrying the server's error envelope (`{ error: { code,
// message } }`), so a page can show the server's own sentence and branch on its stable `code`. Feature PRs add their
// typed calls at the bottom (one exported function per endpoint, as Hallway's src/api.ts does), and their query keys
// in queries.ts.
//
// Requests are same-origin and relative (`/api/...`): the CSP allows `connect-src 'self'` and nothing else.
import type {
  AchievementCreated,
  AchievementRemoved,
  AchievementsPage,
  AchievementView,
  ApiError,
  BackupsResponse,
  CompaniesResponse,
  CompanyEntry,
  DeleteResponse,
  Detached,
  DiscoverAddRequest,
  DiscoverAddResponse,
  DiscoverScanRequest,
  DiscoverScanResponse,
  DiscoverSuggestions,
  EvidenceUploaded,
  ExampleChanged,
  ExampleStatus,
  FolioResponse,
  FoundCountResponse,
  FoundDecided,
  FoundListResponse,
  FoundSourceName,
  GhDetectResponse,
  GithubConnectRequest,
  GithubSettingsRequest,
  GithubSourceStatus,
  GuardCheckResponse,
  HealthResponse,
  ImportReport,
  LinkPreview,
  McpSettingsRequest,
  McpTokenResponse,
  MetaResponse,
  NetworkLogResponse,
  ProblemsResponse,
  ProfileResponse,
  ProjectEntry,
  ProjectReposRequest,
  ProjectsResponse,
  ProjectSummary,
  RepoCreateResponse,
  RepoEntry,
  ReposResponse,
  SettingsResponse,
  SourcesResponse,
  EvidenceOcrResponse,
  ScreenshotsLookBackRequest,
  ScreenshotsSettingsRequest,
  ScreenshotsSourceStatus,
  ScreenshotsSuggestionsResponse,
  WelcomeResponse,
} from '../../shared/api.ts';
import type { Achievement, AchievementCreate, AchievementUpdate, Evidence, FoundCandidate, FoundKeep, Problem, Profile, ProfileUpdate } from '../../shared/schema/index.ts';
// v0.2's AI plumbing (PR22), on a line of its own so the AI PRs' imports don't collide
import type { AiActivityResponse, AiInstructionsName, AiInstructionsReset, AiInstructionsResponse } from '../../shared/api.ts';

/** A failed API call: the HTTP status (0 when the server couldn't be reached) and the envelope's code and message. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

/** The code of a request that never got an answer (the server is stopped, or the network dropped). */
export const NETWORK_ERROR = 'network';

export function isApiError(e: unknown, code?: string): e is ApiRequestError {
  return e instanceof ApiRequestError && (code === undefined || e.code === code);
}

function isEnvelope(v: unknown): v is ApiError {
  const e = (v as ApiError | null)?.error;
  return typeof e?.code === 'string' && typeof e?.message === 'string';
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

async function send<T>(method: Method, path: string, body: string | Blob | undefined, headers: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const unreachable = () => new ApiRequestError(0, NETWORK_ERROR, "Couldn't reach BragDoc. Is it still running?");
  let res: Response;
  let text: string;
  try {
    res = await fetch(path, { method, headers, body, signal });
    if (res.status === 204) return undefined as T;
    text = await res.text();
  } catch (e) {
    // the caller cancelled (abort(), AbortSignal.timeout()): pass its reason on, it isn't the server's fault
    if (signal?.aborted) throw e;
    throw unreachable();
  }
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    /* not JSON: handled below */
  }
  if (!res.ok) {
    if (isEnvelope(data)) throw new ApiRequestError(res.status, data.error.code, data.error.message);
    // a gateway's own error page (a reverse proxy or Docker's port in front of a stopped BragDoc): it didn't answer
    if (res.status === 502 || res.status === 503 || res.status === 504) throw unreachable();
    throw new ApiRequestError(res.status, `http_${res.status}`, `${method} ${path} failed (${res.status}${res.statusText ? ` ${res.statusText}` : ''}).`);
  }
  if (data === undefined && text) throw new ApiRequestError(res.status, 'bad_response', `${method} ${path} answered with something that isn't JSON.`);
  return data as T;
}

function json<T>(method: Method, path: string, body: unknown, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
  // Writes are always JSON (or a typed upload): the server refuses the CORS-safelisted content types (SPEC R3).
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return send<T>(method, path, body === undefined ? undefined : JSON.stringify(body), headers, opts.signal);
}

/**
 * The content types a browser can send cross-site without a preflight. The server refuses them on every write
 * (SPEC R3), so an upload of, say, a `.txt` file goes as `application/octet-stream`; the server sniffs the bytes
 * anyway.
 */
const SAFELISTED = new Set(['text/plain', 'multipart/form-data', 'application/x-www-form-urlencoded']);

export function uploadContentType(type: string): string {
  const base = type.split(';')[0].trim().toLowerCase();
  return !base || SAFELISTED.has(base) ? 'application/octet-stream' : type;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => json<T>('GET', path, undefined, opts),
  post: <T>(path: string, body: unknown = {}, opts?: RequestOptions) => json<T>('POST', path, body, opts),
  put: <T>(path: string, body: unknown, opts?: RequestOptions) => json<T>('PUT', path, body, opts),
  patch: <T>(path: string, body: unknown, opts?: RequestOptions) => json<T>('PATCH', path, body, opts),
  delete: <T>(path: string, opts?: RequestOptions) => json<T>('DELETE', path, undefined, opts),
  /**
   * A typed upload: the file's bytes as the raw body, its type as the Content-Type (never a safelisted one), and its
   * name in `X-Filename` (URI-encoded, since headers are ASCII).
   */
  upload: <T>(path: string, file: Blob & { name?: string }, opts: RequestOptions = {}) =>
    send<T>(
      'POST',
      path,
      file,
      {
        Accept: 'application/json',
        'Content-Type': uploadContentType(file.type),
        ...(file.name ? { 'X-Filename': encodeURIComponent(file.name) } : {}),
        ...opts.headers,
      },
      opts.signal,
    ),
};

/** A path segment, escaped: `api.get(\`/api/projects/${seg(id)}\`)`. */
export const seg = (s: string) => encodeURIComponent(s);

// ---------------------------------------------------------------------------------------------- endpoints

/** `GET /api/health` */
export const getHealth = (signal?: AbortSignal) => api.get<HealthResponse>('/api/health', { signal });

// ---------------------------------------------------------------- board (PR7)

export type AchievementItem = AchievementView<Achievement>;

/** The board's filters (GET /api/achievements); `before` pages back by weeks. */
export interface AchievementFilters {
  q?: string;
  projectId?: string;
  repoId?: string;
  companyId?: string;
  from?: string;
  to?: string;
  archived?: 'exclude' | 'include' | 'only';
  source?: Achievement['source'];
  minImpact?: number;
  weeks?: number;
}

/** A query string from the defined, non-empty values. */
function qs(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : '';
}

/** `GET /api/achievements` */
export const getAchievements = (filters: AchievementFilters & { before?: string }, signal?: AbortSignal) =>
  api.get<AchievementsPage<Achievement>>(`/api/achievements${qs({ ...filters })}`, { signal });
/** `GET /api/achievements/:id` */
export const getAchievement = (id: string, signal?: AbortSignal) => api.get<AchievementItem>(`/api/achievements/${seg(id)}`, { signal });
/** `POST /api/achievements` */
export const createAchievement = (body: AchievementCreate) => api.post<AchievementCreated<Achievement>>('/api/achievements', body);
/** `PATCH /api/achievements/:id`, with the ETag it was read at (a 409 `conflict` if the file changed since). */
export const updateAchievement = (id: string, body: AchievementUpdate, etag: string | null) =>
  api.patch<AchievementItem>(`/api/achievements/${seg(id)}`, body, etag ? { headers: { 'If-Match': etag } } : undefined);
export const archiveAchievement = (id: string, archived = true) => api.post<AchievementItem>(`/api/achievements/${seg(id)}/${archived ? 'archive' : 'unarchive'}`);
export const removeAchievement = (id: string, etag?: string | null) =>
  api.post<AchievementRemoved>(`/api/achievements/${seg(id)}/remove`, {}, etag ? { headers: { 'If-Match': etag } } : undefined);
export const restoreAchievement = (id: string) => api.post<AchievementItem>(`/api/achievements/${seg(id)}/restore`);

/** `POST /api/evidence`: store a file; attach the returned evidence on create or update. */
export const uploadEvidence = (file: Blob & { name?: string }, signal?: AbortSignal) => api.upload<EvidenceUploaded<Evidence>>('/api/evidence', file, { signal });
/** Where a stored file is served (`thumb`: the card's picture). */
export const evidenceUrl = (sha: string, thumb = false) => `/api/evidence/${seg(sha)}${thumb ? '/thumb' : ''}`;
/** `POST /api/link-preview` */
export const previewLink = (url: string, signal?: AbortSignal) => api.post<LinkPreview>('/api/link-preview', { url }, { signal });

/** `GET /api/problems` */
export const getProblems = (signal?: AbortSignal) => api.get<ProblemsResponse<Problem>>('/api/problems', { signal });
/** `GET /api/found/count` */
export const getFoundCount = (signal?: AbortSignal) => api.get<FoundCountResponse>('/api/found/count', { signal });

// settings (PR10)

/** `GET /api/meta` */
export const getMeta = (signal?: AbortSignal) => api.get<MetaResponse>('/api/meta', { signal });
/** `GET /api/network-log`, newest first */
export const getNetworkLog = (offset: number, limit: number, signal?: AbortSignal) =>
  api.get<NetworkLogResponse>(`/api/network-log?offset=${offset}&limit=${limit}`, { signal });
/** `POST /api/network-log/guard-check` */
export const checkEgressGuard = () => api.post<GuardCheckResponse>('/api/network-log/guard-check');
/** `GET /api/backups` */
export const getBackups = (signal?: AbortSignal) => api.get<BackupsResponse>('/api/backups', { signal });
/** `GET /api/settings` */
export const getSettings = (signal?: AbortSignal) => api.get<SettingsResponse>('/api/settings', { signal });
/** `PUT /api/settings/mcp` */
export const putMcpSettings = (body: McpSettingsRequest) => api.put<SettingsResponse>('/api/settings/mcp', body);
/** `GET /api/mcp/token` */
export const getMcpToken = (signal?: AbortSignal) => api.get<McpTokenResponse>('/api/mcp/token', { signal });
/** `POST /api/mcp/token/rotate` */
export const rotateMcpToken = () => api.post<McpTokenResponse>('/api/mcp/token/rotate');

// ---------------------------------------------------------------- importer (PR12)

/**
 * The export file, sent as it is (it can be far over the 1 MB other JSON bodies get: up to 50 MB). Its type is set to
 * JSON whatever the OS called it, since a `.json` file can come with no type at all.
 */
const asJson = (file: File) => new File([file], file.name, { type: 'application/json' });
/** `POST /api/import/plan`: what importing this export would do; writes nothing. */
export const planImport = (file: File, signal?: AbortSignal) => api.upload<ImportReport>('/api/import/plan', asJson(file), { signal });
/** `POST /api/import/apply`: import it. */
export const applyImport = (file: File) => api.upload<ImportReport>('/api/import/apply', asJson(file));
// ---------------------------------------------------------------- projects, companies, repos (PR8)
// Edits and deletes send the entry's etag as If-Match: one made against a stale copy is a 409 (`conflict`).

/** The input types are the server's (shared/schema/inputs.ts), restated loosely: the server validates. */
export interface ProjectInput {
  name?: string;
  description?: string | null;
  color?: string;
  start?: string;
  end?: string | null;
  status?: ProjectEntry['status'];
  companyId?: string | null;
  repoIds?: string[];
}
export interface CompanyInput {
  name?: string;
  role?: string | null;
  start?: string | null;
  end?: string | null;
}
export interface RepoInput {
  name?: string;
  localPath?: string;
  remoteUrl?: string;
}

const ifMatch = (etag?: string) => (etag ? { headers: { 'If-Match': etag } } : undefined);

/** `GET /api/projects` */
export const getProjects = (signal?: AbortSignal) => api.get<ProjectsResponse>('/api/projects', { signal });
/** `GET /api/projects/:id/summary` */
export const getProjectSummary = (id: string, signal?: AbortSignal) => api.get<ProjectSummary>(`/api/projects/${seg(id)}/summary`, { signal });
/** `POST /api/projects` */
export const createProject = (body: ProjectInput) => api.post<ProjectEntry>('/api/projects', body);
/** `PATCH /api/projects/:id` */
export const updateProject = (id: string, body: ProjectInput, etag?: string) => api.patch<ProjectEntry>(`/api/projects/${seg(id)}`, body, ifMatch(etag));
/** `DELETE /api/projects/:id` */
export const deleteProject = (id: string, etag?: string) => api.delete<DeleteResponse>(`/api/projects/${seg(id)}`, ifMatch(etag));
/** `POST /api/projects/:id/restore` */
export const restoreProject = (id: string, reattach?: Detached) => api.post<ProjectEntry>(`/api/projects/${seg(id)}/restore`, { reattach });
/** `POST /api/projects/:id/repos` */
export const linkProjectRepos = (id: string, body: ProjectReposRequest) => api.post<ProjectEntry>(`/api/projects/${seg(id)}/repos`, body);

/** `GET /api/companies` */
export const getCompanies = (signal?: AbortSignal) => api.get<CompaniesResponse>('/api/companies', { signal });
/** `POST /api/companies` */
export const createCompany = (body: CompanyInput) => api.post<CompanyEntry>('/api/companies', body);
/** `PATCH /api/companies/:id` */
export const updateCompany = (id: string, body: CompanyInput, etag?: string) => api.patch<CompanyEntry>(`/api/companies/${seg(id)}`, body, ifMatch(etag));
/** `DELETE /api/companies/:id` */
export const deleteCompany = (id: string, etag?: string) => api.delete<DeleteResponse>(`/api/companies/${seg(id)}`, ifMatch(etag));
/** `POST /api/companies/:id/restore` */
export const restoreCompany = (id: string, reattach?: Detached) => api.post<CompanyEntry>(`/api/companies/${seg(id)}/restore`, { reattach });

/** `GET /api/repos` */
export const getRepos = (signal?: AbortSignal) => api.get<ReposResponse>('/api/repos', { signal });
/** `POST /api/repos` */
export const createRepo = (body: RepoInput) => api.post<RepoCreateResponse>('/api/repos', body);
/** `DELETE /api/repos/:id` */
export const deleteRepo = (id: string, etag?: string) => api.delete<DeleteResponse>(`/api/repos/${seg(id)}`, ifMatch(etag));
/** `POST /api/repos/:id/restore` */
export const restoreRepo = (id: string, reattach?: Detached) => api.post<RepoEntry>(`/api/repos/${seg(id)}/restore`, { reattach });

// ---------------------------------------------------------------- Folio (PR14)

/** `GET /api/folio`: a window's achievements, cut down to what a folio may show. */
export const getFolio = (from: string, to: string, signal?: AbortSignal) => api.get<FolioResponse>(`/api/folio?${new URLSearchParams({ from, to })}`, { signal });

// ---------------------------------------------------------------- Found + sources (PR13)

/** `GET /api/found`: pending candidates (one source's, or all) and the per-source counts. */
export const getFound = (source: FoundSourceName | undefined, signal?: AbortSignal) => api.get<FoundListResponse<FoundCandidate>>(`/api/found${qs({ source })}`, { signal });
export const keepFound = (id: string, body: FoundKeep = {}) => api.post<FoundDecided<FoundCandidate>>(`/api/found/${seg(id)}/keep`, body);
export const mergeFound = (id: string, achievementId: string) => api.post<FoundDecided<FoundCandidate>>(`/api/found/${seg(id)}/merge`, { achievementId });
export const dismissFound = (id: string) => api.post<FoundDecided<FoundCandidate>>(`/api/found/${seg(id)}/dismiss`);
export const undoFound = (id: string) => api.post<FoundDecided<FoundCandidate>>(`/api/found/${seg(id)}/undo`);

/** `GET /api/sources` */
export const getSources = (signal?: AbortSignal) => api.get<SourcesResponse>('/api/sources', { signal });
/** `GET /api/sources/github/gh`: is gh on PATH (nothing runs) */
export const getGhInstalled = (signal?: AbortSignal) => api.get<GhDetectResponse>('/api/sources/github/gh', { signal });
export const connectGithub = (body: GithubConnectRequest) => api.post<GithubSourceStatus>('/api/sources/github/connect', body);
export const putGithub = (body: GithubSettingsRequest) => api.put<GithubSourceStatus>('/api/sources/github', body);
/** Check now: resolves when the check has finished. */
export const runGithub = () => api.post<GithubSourceStatus>('/api/sources/github/run');
export const disconnectGithub = (forgetToken = false) => api.post<GithubSourceStatus>('/api/sources/github/disconnect', { forgetToken });

// ---------------------------------------------------------------- the screenshots folder (PR15)

/** `GET /api/sources/screenshots/suggestions`: where screenshots probably go on this computer (the folder picker's list). */
export const getScreenshotSuggestions = (signal?: AbortSignal) => api.get<ScreenshotsSuggestionsResponse>('/api/sources/screenshots/suggestions', { signal });
/** Choose the folder, switch it on or off, the name filter. The folder is checked first (an ApiError says what's wrong). */
export const putScreenshots = (body: ScreenshotsSettingsRequest) => api.put<ScreenshotsSourceStatus>('/api/sources/screenshots', body);
/** Read the last `days` of screenshots in the folder, once. */
export const lookBackScreenshots = (body: ScreenshotsLookBackRequest = {}) => api.post<ScreenshotsSourceStatus>('/api/sources/screenshots/look-back', body);
/** `GET /api/evidence/:sha/ocr`: the text read from a picture on the board (and a quote, if the rules pass). */
export const getEvidenceOcr = (sha: string, signal?: AbortSignal) => api.get<EvidenceOcrResponse>(`/api/evidence/${seg(sha)}/ocr`, { signal });
/** A screenshot candidate's picture, read from where it is. */
export const foundPictureUrl = (id: string) => `/api/found/${seg(id)}/picture`;
// ---------------------------------------------------------------- onboarding (PR16)

/** `GET /api/welcome`: open Welcome? (no profile.yaml, and it wasn't skipped) */
export const getWelcome = (signal?: AbortSignal) => api.get<WelcomeResponse>('/api/welcome', { signal });
/** Skip Welcome (or, with `false`, show it again on the next visit to the board). */
export const skipWelcome = (skipped = true) => api.post<WelcomeResponse>('/api/welcome/skip', { skipped });
export const getProfile = (signal?: AbortSignal) => api.get<ProfileResponse<Profile>>('/api/profile', { signal });
export const putProfile = (body: ProfileUpdate) => api.put<ProfileResponse<Profile>>('/api/profile', body);
export const getDiscoverSuggestions = (signal?: AbortSignal) => api.get<DiscoverSuggestions>('/api/discover/suggestions', { signal });
export const scanForRepos = (body: DiscoverScanRequest, signal?: AbortSignal) => api.post<DiscoverScanResponse>('/api/discover/scan', body, { signal });
export const addDiscoveredRepos = (body: DiscoverAddRequest) => api.post<DiscoverAddResponse>('/api/discover/add', body);
export const getExample = (signal?: AbortSignal) => api.get<ExampleStatus>('/api/example', { signal });
export const addExample = () => api.post<ExampleChanged>('/api/example', {});
export const removeExample = () => api.post<ExampleChanged>('/api/example/remove', {});

// ---------------------------------------------------------------- AI plumbing (PR22): instructions, activity

/** `GET /api/ai/instructions/:name`: the file (all of it, for an editor), what a model is given, its Problems. */
export const getAiInstructions = (name: AiInstructionsName, signal?: AbortSignal) => api.get<AiInstructionsResponse>(`/api/ai/instructions/${seg(name)}`, { signal });
/** Save the whole file. Send the ETag you read: a stale one is a 409, and a broken file needs it to be replaced. */
export const putAiInstructions = (name: AiInstructionsName, text: string, etag?: string | null) =>
  api.put<AiInstructionsResponse>(`/api/ai/instructions/${seg(name)}`, { text }, etag ? { headers: { 'If-Match': etag } } : undefined);
/** Put the feature's starter back (your version is moved to backups/removed/). */
export const resetAiInstructions = (name: AiInstructionsName) => api.post<AiInstructionsReset>(`/api/ai/instructions/${seg(name)}/reset`, {});
/** `GET /api/ai/activity`: the AI activity log, newest first. */
export const getAiActivity = (opts: { limit?: number; offset?: number } = {}, signal?: AbortSignal) =>
  api.get<AiActivityResponse>(`/api/ai/activity?limit=${opts.limit ?? 50}&offset=${opts.offset ?? 0}`, { signal });
