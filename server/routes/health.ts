// GET /api/health: the liveness check (the service's readiness wait, Docker's HEALTHCHECK and smoke-pack use it).
import type { Hono } from 'hono';
import type { HealthResponse } from '../../shared/api.js';
import type { AppContext } from '../context.js';

export function registerHealth(app: Hono, ctx: AppContext): void {
  app.get('/api/health', (c) => c.json({ ok: true, version: ctx.version } satisfies HealthResponse));
}
