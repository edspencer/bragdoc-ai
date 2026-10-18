// GET /api/found/count: how many candidates are waiting in Found, for the board's strip and the nav badge. The rest of
// Found's API (the list, keep, merge, dismiss) is PR13's; it may fold this route into its own module.
import type { Hono } from 'hono';
import type { FoundCountResponse } from '../../shared/api.js';
import type { AppContext } from '../context.js';

export function registerFoundCount(app: Hono, ctx: AppContext): void {
  app.get('/api/found/count', (c) => c.json({ pending: ctx.services.found.pendingCount() } satisfies FoundCountResponse));
}
