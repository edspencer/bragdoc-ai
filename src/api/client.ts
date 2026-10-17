// The web app's side of the HTTP API (types in shared/api.ts). One small wrapper, `api`, does every request: JSON in,
// JSON out, and any failure becomes an ApiRequestError carrying the server's error envelope (`{ error: { code,
// message } }`), so a page can show the server's own sentence and branch on its stable `code`. Feature PRs add their
// typed calls at the bottom (one exported function per endpoint, as Hallway's src/api.ts does), and their query keys
// in queries.ts.
//
// Requests are same-origin and relative (`/api/...`): the CSP allows `connect-src 'self'` and nothing else.
import type { ApiError, HealthResponse, ImportReport } from '../../shared/api.ts';

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
