// The web app's side of the HTTP API (types in shared/api.ts). One small wrapper, `api`, does every request: JSON in,
// JSON out, and any failure becomes an ApiRequestError carrying the server's error envelope (`{ error: { code,
// message } }`), so a page can show the server's own sentence and branch on its stable `code`. Feature PRs add their
// typed calls at the bottom (one exported function per endpoint, as Hallway's src/api.ts does), and their query keys
// in queries.ts.
//
// Requests are same-origin and relative (`/api/...`): the CSP allows `connect-src 'self'` and nothing else.
import type {
  ApiError,
  CompaniesResponse,
  CompanyEntry,
  DeleteResponse,
  Detached,
  HealthResponse,
  ProjectEntry,
  ProjectReposRequest,
  ProjectSummary,
  ProjectsResponse,
  RepoCreateResponse,
  RepoEntry,
  ReposResponse,
} from '../../shared/api.ts';

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
