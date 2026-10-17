// Small HTTP helpers shared by the app (index.ts) and every route module. Kept apart from index.ts so route modules
// never import the app that imports them (an import cycle that breaks as soon as index.ts grows a non-hoisted export).
import type { Context } from 'hono';
import type { ApiError } from '../shared/api.js';
import { ConflictError, NotFoundError, ValidationError } from './store/errors.js';

/** An API error body (shared/api.ts ApiError): `c.json(apiError('not_found', '…'), 404)`. */
export function apiError(code: string, message: string): ApiError {
  return { error: { code, message } };
}

/**
 * The response for an error the store or a service threw (server/store/errors.ts): NotFoundError → 404,
 * ValidationError → 400, ConflictError and ReadOnlyError → 409 (with the file's current ETag, so the client can say
 * "it changed"). Anything else is rethrown, for Hono's 500.
 */
export function storeErrorResponse(c: Context, e: unknown): Response {
  if (e instanceof NotFoundError) return c.json(apiError('not_found', e.message), 404);
  if (e instanceof ValidationError) return c.json({ ...apiError('invalid', e.message), issues: e.issues }, 400);
  if (e instanceof ConflictError) {
    if (e.etag) c.header('ETag', e.etag);
    return c.json(apiError(e.code, e.message), 409);
  }
  throw e;
}
