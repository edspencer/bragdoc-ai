// GET /api/problems: everything wrong with the data home's files (SPEC R2), errors first: the board's banner and
// Settings → Data (PR10) both read it. It changes with every store change (`{ type: 'problems' }` on the bus).
import type { Hono } from 'hono';
import type { ProblemsResponse } from '../../shared/api.js';
import type { Problem } from '../../shared/schema/index.js';
import type { AppContext } from '../context.js';

export function registerProblems(app: Hono, ctx: AppContext): void {
  app.get('/api/problems', (c) => c.json({ problems: ctx.store.problems() } satisfies ProblemsResponse<Problem>));
}
