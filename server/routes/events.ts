// GET /api/events: the live-update stream (server/events.ts). Its Origin check is security.ts's, like every request's.
import type { Hono } from 'hono';
import type { AppContext } from '../context.js';
import { sseHandler } from '../events.js';

export function registerEvents(app: Hono, ctx: AppContext): void {
  app.get('/api/events', sseHandler(ctx.bus));
}
