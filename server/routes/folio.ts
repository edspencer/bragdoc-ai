// Folio (SPEC R9): GET /api/folio?from=YYYY-MM-DD&to=YYYY-MM-DD, the window's achievements (archived ones left out)
// cut down to what a folio may show (shared/folio.ts toClipping, D55), plus every project and company and the
// profile's name. The page does the rest (filters, include/exclude, the printout, the markdown) from that, so changing
// a filter never waits on the server. Read-only: a folio is made in the browser and downloaded from there.
import type { Hono } from 'hono';
import { isDay, toClipping, type FolioResponse } from '../../shared/folio.js';
import type { AppContext } from '../context.js';
import { apiError } from '../http.js';

/** The longest window one request may ask for, in years: a career, not an accident. */
const MAX_YEARS = 50;

export function registerFolio(app: Hono, ctx: AppContext): void {
  const { store } = ctx;
  app.get('/api/folio', (c) => {
    const q = c.req.query();
    const unknown = Object.keys(q).filter((k) => k !== 'from' && k !== 'to');
    if (unknown.length) return c.json(apiError('invalid', `Unknown query parameter: ${unknown.join(', ')}.`), 400);
    const { from, to } = q;
    if (!isDay(from) || !isDay(to)) return c.json(apiError('invalid', 'from and to are dates, YYYY-MM-DD.'), 400);
    if (from > to) return c.json(apiError('invalid', 'from is after to.'), 400);
    if (Number(to.slice(0, 4)) - Number(from.slice(0, 4)) > MAX_YEARS) return c.json(apiError('invalid', `A folio covers at most ${MAX_YEARS} years.`), 400);

    const has = { project: (id: string) => !!store.get('project', id), company: (id: string) => !!store.get('company', id) };
    const fileName = (sha: string) => store.get('evidence', sha)?.originalName;
    const items = store
      .all('achievement')
      .filter((a) => !a.archived && a.happenedAt >= from && a.happenedAt <= to)
      .sort((a, b) => b.happenedAt.localeCompare(a.happenedAt))
      .map((a) => toClipping(a, fileName, has));
    return c.json({
      from,
      to,
      author: store.profile()?.name ?? null,
      items,
      projects: store.all('project').map((p) => ({ id: p.id, name: p.name, color: p.color, companyId: p.companyId && has.company(p.companyId) ? p.companyId : null })),
      companies: store.all('company').map((co) => ({ id: co.id, name: co.name })),
    } satisfies FolioResponse);
  });
}
