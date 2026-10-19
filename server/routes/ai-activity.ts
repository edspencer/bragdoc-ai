// The AI activity log (v0.2, SPEC R20, D68): one line per run or call, never any content.
//   GET /api/ai/activity?limit=&offset=   AiActivityResponse, newest first (limit 1–500, default 50)
// Live: a `{ type: 'ai-activity' }` event follows each new line written by this server. Lines written by another
// process on the same data home (`bragdoc dev ai`, an eval script) show on the next read.
import type { Hono } from 'hono';
import type { AiActivityResponse } from '../../shared/api.js';
import type { AppContext } from '../context.js';
import { apiError } from '../http.js';

const int = (s: string | undefined, dflt: number, min: number, max: number): number | null => {
  if (s === undefined || s === '') return dflt;
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return n >= min && n <= max ? n : null;
};

export function registerAiActivity(app: Hono, ctx: AppContext): void {
  app.get('/api/ai/activity', (c) => {
    const limit = int(c.req.query('limit'), 50, 1, 500);
    const offset = int(c.req.query('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
    if (limit === null || offset === null) return c.json(apiError('invalid', 'limit is 1–500 and offset a whole number'), 400);
    return c.json(ctx.aiActivity.read({ limit, offset }) satisfies AiActivityResponse);
  });
}
