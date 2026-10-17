// Companies (SPEC R6): optional, so a project can have none. Deleting one leaves its projects in "No company" (D40).
//   GET    /api/companies                every company (CompaniesResponse)
//   POST   /api/companies                create (CompanyCreateSchema) → 201 CompanyEntry
//   PATCH  /api/companies/:id            edit (CompanyUpdateSchema; If-Match)
//   DELETE /api/companies/:id            move aside + take it off projects and achievements → DeleteResponse
//   POST   /api/companies/:id/restore    undo a delete ({ reattach }) → CompanyEntry
import type { Hono } from 'hono';
import type { CompaniesResponse } from '../../shared/api.js';
import { RestoreSchema } from '../../shared/schema/index.js';
import type { AppContext } from '../context.js';
import { handle, jsonBody } from '../http.js';
import { validate } from '../services/util.js';
import { companyEntry, ifMatch } from './entries.js';

export function registerCompanies(app: Hono, ctx: AppContext): void {
  const { store, services } = ctx;
  const entry = (v: Parameters<typeof companyEntry>[1]) => companyEntry(store, v);

  app.get('/api/companies', (c) => c.json({ companies: services.companies.list().map(entry) } satisfies CompaniesResponse));
  app.post('/api/companies', (c) => handle(c, async () => entry(services.companies.create(await jsonBody(c.req))), 201));
  app.get('/api/companies/:id', (c) => handle(c, () => entry(services.companies.get(c.req.param('id')))));
  app.patch('/api/companies/:id', (c) => handle(c, async () => entry(services.companies.update(c.req.param('id'), await jsonBody(c.req), ifMatch(c.req)))));
  app.delete('/api/companies/:id', (c) => handle(c, () => services.companies.removeAndDetach(c.req.param('id'), ifMatch(c.req))));
  app.post('/api/companies/:id/restore', (c) =>
    handle(c, async () => {
      const { reattach } = validate(RestoreSchema, await jsonBody(c.req));
      return entry(services.companies.restoreAndReattach(c.req.param('id'), reattach));
    }),
  );
}
