// GET /api/network-log?limit=&offset=: every outbound request BragDoc made (or refused to make), newest first, for
// Settings → Network activity (SPEC R4, R13).
// POST /api/network-log/guard-check: "Test the guard". Asks egress for a request to a host no allow-list can contain,
// so the user can watch it be refused (and logged) rather than take the promise on trust.
import type { Hono } from 'hono';
import type { GuardCheckResponse } from '../../shared/api.js';
import type { AppContext } from '../context.js';
import { EgressDenied, readNetworkLog } from '../egress.js';
import { apiError } from '../http.js';

const MAX_LIMIT = 500;
/** `.invalid` is reserved (RFC 2606): it never resolves, so even a broken guard couldn't send this anywhere. */
export const GUARD_CHECK_HOST = 'guard-check.bragdoc.invalid';

export function registerNetwork(app: Hono, ctx: AppContext): void {
  app.get('/api/network-log', (c) => {
    const limit = c.req.query('limit') ?? '100';
    const offset = c.req.query('offset') ?? '0';
    if (!/^\d{1,6}$/.test(limit) || !/^\d{1,9}$/.test(offset) || Number(limit) < 1)
      return c.json(apiError('invalid', 'limit and offset are whole numbers (limit at least 1)'), 400);
    return c.json(readNetworkLog(ctx.dataDir, { limit: Math.min(Number(limit), MAX_LIMIT), offset: Number(offset) }));
  });

  app.post('/api/network-log/guard-check', async (c) => {
    try {
      const res = await ctx.egress.egressFetch({ purpose: 'settings.guard-check' }, `https://${GUARD_CHECK_HOST}/`);
      await res.body?.cancel();
      return c.json({ refused: false, host: GUARD_CHECK_HOST, message: `The request to ${GUARD_CHECK_HOST} was not refused: the egress guard is broken.` } satisfies GuardCheckResponse);
    } catch (e) {
      if (e instanceof EgressDenied) return c.json({ refused: true, host: GUARD_CHECK_HOST, message: e.message } satisfies GuardCheckResponse);
      // not refused by the guard, but it failed on the way out (it can't resolve): still a broken guard
      return c.json({ refused: false, host: GUARD_CHECK_HOST, message: `The request to ${GUARD_CHECK_HOST} was not refused by the guard (${(e as Error).message}).` } satisfies GuardCheckResponse);
    }
  });
}
