// The data behind a folio (D55): a window's achievements (archived ones left out), newest first, cut down to clippings
// (shared/folio.ts toClipping), plus every project and company and the profile's name. GET /api/folio answers with it,
// and Draft with AI (PR27) rebuilds the same thing from the folio's state, so a draft is made from exactly what the page
// shows and never from text the page sent.
import { toClipping, type FolioResponse } from '../shared/folio.js';
import type { Store } from './store/index.js';

/** The longest window one request may ask for, in years: a career, not an accident. */
export const FOLIO_MAX_YEARS = 50;

export function folioData(store: Store, from: string, to: string): FolioResponse {
  const has = { project: (id: string) => !!store.get('project', id), company: (id: string) => !!store.get('company', id) };
  const fileName = (sha: string) => store.get('evidence', sha)?.originalName;
  const items = store
    .all('achievement')
    .filter((a) => !a.archived && a.happenedAt >= from && a.happenedAt <= to)
    .sort((a, b) => b.happenedAt.localeCompare(a.happenedAt))
    .map((a) => toClipping(a, fileName, has));
  return {
    from,
    to,
    author: store.profile()?.name ?? null,
    items,
    projects: store.all('project').map((p) => ({ id: p.id, name: p.name, color: p.color, companyId: p.companyId && has.company(p.companyId) ? p.companyId : null })),
    companies: store.all('company').map((co) => ({ id: co.id, name: co.name })),
  };
}
