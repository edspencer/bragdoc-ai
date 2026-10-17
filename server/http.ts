// Small HTTP helpers shared by the app (index.ts) and every route module. Kept apart from index.ts so route modules
// never import the app that imports them (an import cycle that breaks as soon as index.ts grows a non-hoisted export).
import type { ApiError } from '../shared/api.js';

/** An API error body (shared/api.ts ApiError): `c.json(apiError('not_found', '…'), 404)`. */
export function apiError(code: string, message: string): ApiError {
  return { error: { code, message } };
}
