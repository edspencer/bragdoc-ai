// Folio (SPEC R9): GET /api/folio?from=YYYY-MM-DD&to=YYYY-MM-DD, the window's achievements (archived ones left out)
// cut down to what a folio may show (shared/folio.ts toClipping, D55), plus every project and company and the
// profile's name. The page does the rest (filters, include/exclude, the printout, the markdown) from that, so changing
// a filter never waits on the server. Read-only: a folio is made in the browser and downloaded from there.
import type { Hono } from 'hono';
import { isDay, type FolioResponse } from '../../shared/folio.js';
import type { AppContext } from '../context.js';
import { FOLIO_MAX_YEARS as MAX_YEARS, folioData } from '../folio.js';
import { apiError } from '../http.js';

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

    return c.json(folioData(store, from, to) satisfies FolioResponse);
  });
}
