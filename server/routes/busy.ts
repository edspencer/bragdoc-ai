// GET /api/busy (cli-contract SPEC §4, D86): what `bragdoc busy`, `service stop` and `service restart` ask before
// they stop the server. Counts only, and no auth, until the contract settles how a caller proves it's local.
//
// It must be cheap: in-memory state, plus the one small file that says whether a terminal's `bragdoc import` holds the
// lock. OCR waiting in its queue doesn't count: the board's pictures are read again after a restart.
import type { Hono } from 'hono';
import type { BusyResponse } from '../../shared/api.js';
import type { AppContext } from '../context.js';
import { importRunning } from '../import/lock.js';

export function busyCounts(ctx: AppContext): BusyResponse['counts'] {
  const ai = Object.values(ctx.ai.queue()).reduce((n, q) => n + q.running + q.waiting, 0);
  return { import: importRunning(ctx.dataDir) ? 1 : 0, judge: ctx.judge.busy() ? 1 : 0, ai };
}

export function registerBusy(app: Hono, ctx: AppContext): void {
  app.get('/api/busy', (c) => {
    const counts = busyCounts(ctx);
    return c.json({ busy: Object.values(counts).some((n) => n > 0), version: ctx.version, counts } satisfies BusyResponse);
  });
}
