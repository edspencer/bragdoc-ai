// The board's achievements (SPEC R5): list a page of weeks with filters and search, read one, add, edit, archive,
// remove (to backups/removed/) and restore. Everything goes through ctx.services.achievements (D24); the request
// bodies are the services' input schemas (shared/schema/inputs.ts), so an unknown key is a 400.
//
//   GET   /api/achievements                     AchievementsPage (query: see shared/api.ts)
//   GET   /api/achievements/:id                 AchievementView
//   POST  /api/achievements                     AchievementCreate → AchievementCreated (201, or 200 if already there)
//   PATCH /api/achievements/:id                 AchievementUpdate (+ If-Match) → AchievementView
//   POST  /api/achievements/:id/archive         → AchievementView        (and /unarchive)
//   POST  /api/achievements/:id/remove          (+ If-Match) → AchievementRemoved
//   POST  /api/achievements/:id/restore         → AchievementView (the newest removed copy)
import type { Context, Hono } from 'hono';
import type { AchievementCreated, AchievementRemoved, AchievementsPage } from '../../shared/api.js';
import type { Achievement } from '../../shared/schema/index.js';
import type { AppContext } from '../context.js';
import { apiError, storeErrorResponse } from '../http.js';
import { achievementView } from '../views.js';

/** Weeks per page: the default, and the most one request may ask for. */
export const DEFAULT_WEEKS = 8;
export const MAX_WEEKS = 104;
/** The service lists at most this many per call; the board pages through them all (they're in memory). */
const CHUNK = 1000;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The Monday on or before a calendar day (YYYY-MM-DD), as the web app's weeks are (src/lib/dates.ts weekStart). */
export function mondayOf(day: string): string {
  const d = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Read a JSON body; null (and the 400 to send) when it isn't JSON. */
async function body(c: Context): Promise<{ ok: true; value: unknown } | { ok: false; res: Response }> {
  try {
    return { ok: true, value: await c.req.json() };
  } catch {
    return { ok: false, res: c.json(apiError('invalid', 'The body is not valid JSON.'), 400) };
  }
}

export function registerAchievements(app: Hono, ctx: AppContext): void {
  const svc = () => ctx.services.achievements;
  const view = (a: Achievement) => achievementView(ctx.store, a);

  app.get('/api/achievements', (c) => {
    const q = c.req.query();
    const known = ['q', 'projectId', 'repoId', 'companyId', 'from', 'to', 'archived', 'source', 'minImpact', 'weeks', 'before'];
    const unknown = Object.keys(q).filter((k) => !known.includes(k));
    if (unknown.length) return c.json(apiError('invalid', `Unknown query parameter: ${unknown.join(', ')}.`), 400);
    const weeks = q.weeks === undefined ? DEFAULT_WEEKS : Number(q.weeks);
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > MAX_WEEKS) return c.json(apiError('invalid', `weeks is a whole number from 1 to ${MAX_WEEKS}.`), 400);
    if (q.before !== undefined && !DAY.test(q.before)) return c.json(apiError('invalid', 'before is a date, YYYY-MM-DD.'), 400);
    if (q.minImpact !== undefined && !/^\d{1,2}$/.test(q.minImpact)) return c.json(apiError('invalid', 'minImpact is a whole number from 1 to 10.'), 400);
    const filters = Object.fromEntries(
      Object.entries({
        q: q.q?.trim() || undefined,
        projectId: q.projectId,
        repoId: q.repoId,
        companyId: q.companyId,
        from: q.from,
        to: q.to,
        archived: q.archived,
        source: q.source,
        minImpact: q.minImpact === undefined ? undefined : Number(q.minImpact),
      }).filter(([, v]) => v !== undefined && v !== ''),
    );
    try {
      // newest first, search included: the board groups by week, so best-match order would scatter the weeks
      const all: Achievement[] = [];
      let total = 0;
      do {
        const r = svc().list({ ...filters, sort: 'date', limit: CHUNK, offset: all.length });
        total = r.total;
        all.push(...r.items);
        if (!r.items.length) break;
      } while (all.length < total);
      const before = q.before ? mondayOf(q.before) : null;
      const pool = before ? all.filter((a) => mondayOf(a.happenedAt) < before) : all;
      const items: Achievement[] = [];
      const seen = new Set<string>();
      let nextBefore: string | null = null;
      for (const a of pool) {
        const w = mondayOf(a.happenedAt);
        if (!seen.has(w)) {
          if (seen.size === weeks) {
            nextBefore = [...seen].at(-1)!;
            break;
          }
          seen.add(w);
        }
        items.push(a);
      }
      return c.json({ items: items.map(view), total, nextBefore } satisfies AchievementsPage<Achievement>);
    } catch (e) {
      return storeErrorResponse(c, e);
    }
  });

  app.get('/api/achievements/:id', (c) => {
    try {
      return c.json(view(svc().get(c.req.param('id'))));
    } catch (e) {
      return storeErrorResponse(c, e);
    }
  });

  app.post('/api/achievements', async (c) => {
    const b = await body(c);
    if (!b.ok) return b.res;
    try {
      const { achievement, created } = svc().create(b.value);
      return c.json({ achievement: view(achievement), created } satisfies AchievementCreated<Achievement>, created ? 201 : 200);
    } catch (e) {
      return storeErrorResponse(c, e);
    }
  });

  app.patch('/api/achievements/:id', async (c) => {
    const b = await body(c);
    if (!b.ok) return b.res;
    try {
      return c.json(view(svc().update(c.req.param('id'), b.value, { ifMatch: c.req.header('if-match') ?? null })));
    } catch (e) {
      return storeErrorResponse(c, e);
    }
  });

  for (const [action, archived] of [
    ['archive', true],
    ['unarchive', false],
  ] as const) {
    app.post(`/api/achievements/:id/${action}`, (c) => {
      try {
        return c.json(view(svc().archive(c.req.param('id'), archived)));
      } catch (e) {
        return storeErrorResponse(c, e);
      }
    });
  }

  app.post('/api/achievements/:id/remove', (c) => {
    try {
      return c.json(svc().remove(c.req.param('id'), { ifMatch: c.req.header('if-match') ?? null }) satisfies AchievementRemoved);
    } catch (e) {
      return storeErrorResponse(c, e);
    }
  });

  app.post('/api/achievements/:id/restore', (c) => {
    try {
      return c.json(view(svc().restore(c.req.param('id'))));
    } catch (e) {
      return storeErrorResponse(c, e);
    }
  });
}
