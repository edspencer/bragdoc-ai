// Projects (SPEC R6): create, edit, delete (with undo), link repos, and a project's pile for the Projects page. The
// list (GET /api/projects) is in catalog.ts, shared with the Board (PR7).
//   POST   /api/projects                 create (ProjectCreateSchema) → 201 ProjectEntry
//   GET    /api/projects/:id             one ProjectEntry
//   PATCH  /api/projects/:id             edit (ProjectUpdateSchema; If-Match)
//   DELETE /api/projects/:id             move aside + untag its achievements (If-Match; D45) → DeleteResponse
//   POST   /api/projects/:id/restore     undo a delete ({ reattach }) → ProjectEntry
//   POST   /api/projects/:id/repos       link / unlink repos ({ link, unlink }) → ProjectEntry
//   GET    /api/projects/:id/summary     its pile and counts (ProjectSummary)
import type { Hono } from 'hono';
import { PILE_LIMIT, type PileItem, type ProjectSummary } from '../../shared/api.js';
import { ProjectReposSchema, RestoreSchema } from '../../shared/schema/index.js';
import type { AppContext } from '../context.js';
import { handle, jsonBody } from '../http.js';
import { requireIds, validate } from '../services/util.js';
import { companyEntry, ifMatch, projectEntry, repoEntry } from './entries.js';

export function registerProjects(app: Hono, ctx: AppContext): void {
  const { store, services } = ctx;
  const entry = (p: Parameters<typeof projectEntry>[1]) => projectEntry(store, p);

  app.post('/api/projects', (c) => handle(c, async () => entry(services.projects.create(await jsonBody(c.req))), 201));

  app.get('/api/projects/:id', (c) => handle(c, () => entry(services.projects.get(c.req.param('id')))));

  app.patch('/api/projects/:id', (c) => handle(c, async () => entry(services.projects.update(c.req.param('id'), await jsonBody(c.req), ifMatch(c.req)))));

  app.delete('/api/projects/:id', (c) => handle(c, () => services.projects.removeAndDetach(c.req.param('id'), ifMatch(c.req))));

  app.post('/api/projects/:id/restore', (c) =>
    handle(c, async () => {
      const { reattach } = validate(RestoreSchema, await jsonBody(c.req));
      return entry(services.projects.restoreAndReattach(c.req.param('id'), reattach));
    }),
  );

  app.post('/api/projects/:id/repos', (c) =>
    handle(c, async () => {
      const id = c.req.param('id');
      const { link = [], unlink = [] } = validate(ProjectReposSchema, await jsonBody(c.req));
      services.projects.get(id); // 404, and unknown repo ids, before anything changes: never half-applied
      requireIds(store, 'repo', link, 'link');
      for (const r of link) services.projects.linkRepo(id, r);
      for (const r of unlink) services.projects.unlinkRepo(id, r);
      return entry(services.projects.get(id));
    }),
  );

  app.get('/api/projects/:id/summary', (c) =>
    handle(c, () => {
      const p = services.projects.get(c.req.param('id'));
      const items = [...store.achievementIdsIn('project', p.id)]
        .map((id) => store.get('achievement', id))
        .filter((a) => a && !a.archived)
        .map((a) => a!)
        .sort((a, b) => (a.happenedAt < b.happenedAt ? 1 : a.happenedAt > b.happenedAt ? -1 : a.id < b.id ? 1 : -1));
      const byKind: Record<string, number> = {};
      let total = 0;
      const pile: PileItem[] = items.map((a) => {
        const evidence: Record<string, number> = {};
        for (const e of a.evidence) {
          evidence[e.kind] = (evidence[e.kind] ?? 0) + 1;
          byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
          total++;
        }
        return { id: a.id, title: a.title, summary: a.summary, happenedAt: a.happenedAt, impact: a.impact, archived: a.archived, evidence };
      });
      const company = p.companyId ? store.get('company', p.companyId) : undefined;
      return {
        project: entry(p),
        company: company ? companyEntry(store, company) : null,
        repos: p.repoIds.flatMap((id) => {
          const r = store.get('repo', id);
          return r ? [repoEntry(store, r)] : [];
        }),
        achievements: items.length,
        evidence: { total, byKind },
        firstAt: items.at(-1)?.happenedAt ?? null,
        lastAt: items[0]?.happenedAt ?? null,
        pile: pile.slice(0, PILE_LIMIT),
      } satisfies ProjectSummary;
    }),
  );
}
