// GET /api/network-log?limit=&offset=: every outbound request BragDoc made (or refused to make), newest first, for
// Settings → Network activity (SPEC R4, R13).
import type { Hono } from 'hono';
import type { AppContext } from '../context.js';
import { readNetworkLog } from '../egress.js';
import { apiError } from '../http.js';

const MAX_LIMIT = 500;

export function registerNetwork(app: Hono, ctx: AppContext): void {
  app.get('/api/network-log', (c) => {
    const limit = c.req.query('limit') ?? '100';
    const offset = c.req.query('offset') ?? '0';
    if (!/^\d{1,6}$/.test(limit) || !/^\d{1,9}$/.test(offset) || Number(limit) < 1)
      return c.json(apiError('invalid', 'limit and offset are whole numbers (limit at least 1)'), 400);
    return c.json(readNetworkLog(ctx.dataDir, { limit: Math.min(Number(limit), MAX_LIMIT), offset: Number(offset) }));
  });
}
