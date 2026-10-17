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
 * The store's errors (server/store/errors.ts) as an HTTP answer: NotFoundError → 404, ValidationError → 400,
 * ConflictError and ReadOnlyError → 409, each with its own code and sentence. Anything else is rethrown (a 500).
 * Use it around a service call: `try { … } catch (e) { const r = storeError(e); return c.json(r.body, r.status); }`.
 */
export function storeError(e: unknown): { body: ApiError; status: 400 | 404 | 409 } {
  if (e instanceof NotFoundError) return { body: apiError(e.code, e.message), status: 404 };
  if (e instanceof ValidationError) return { body: apiError(e.code, e.message), status: 400 };
  if (e instanceof ConflictError) return { body: apiError(e.code, e.message), status: 409 };
  throw e;
}

/** A request's JSON body, or undefined when there is none or it doesn't parse (the service's validation says why). */
export async function jsonBody(req: { text: () => Promise<string> }): Promise<unknown> {
  const text = await req.text();
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError('the request body isn\'t valid JSON');
  }
}

/**
 * Run a route's work and answer with its result as JSON (`status`, default 200), or with the store error it threw
 * (storeError). `app.patch('/api/things/:id', (c) => handle(c, async () => ctx.services.things.update(…)))`.
 */
export async function handle(c: Context, fn: () => unknown, status: 200 | 201 = 200): Promise<Response> {
  try {
    return c.json((await fn()) as object, status);
  } catch (e) {
    const r = storeError(e);
    return c.json(r.body, r.status);
  }
}
