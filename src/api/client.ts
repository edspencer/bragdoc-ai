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
  EvidenceUploaded,
  FoundCountResponse,
  HealthResponse,
  LinkPreview,
  ProblemsResponse,
  ProjectsResponse,
  ReposResponse,
} from '../../shared/api.ts';
import type { Achievement, AchievementCreate, AchievementUpdate, Evidence, Problem, Project, Repo } from '../../shared/schema/index.ts';

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

/** `GET /api/projects` (read-only until PR8) */
export const getProjects = (signal?: AbortSignal) => api.get<ProjectsResponse<Project>>('/api/projects', { signal });
/** `GET /api/repos` (read-only until PR8) */
export const getRepos = (signal?: AbortSignal) => api.get<ReposResponse<Repo>>('/api/repos', { signal });
/** `GET /api/problems` */
export const getProblems = (signal?: AbortSignal) => api.get<ProblemsResponse<Problem>>('/api/problems', { signal });
/** `GET /api/found/count` */
export const getFoundCount = (signal?: AbortSignal) => api.get<FoundCountResponse>('/api/found/count', { signal });
