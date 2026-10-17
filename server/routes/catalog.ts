// Read-only lists of projects and repos, so the board's pickers and pills work (SPEC R5). The writes, and companies,
// are PR8's (its own route modules); these two GETs stay here.
//
//   GET /api/projects   ProjectsResponse: every project, newest start first
//   GET /api/repos      ReposResponse: every repo, by name
import type { Hono } from 'hono';
import type { ProjectsResponse, ReposResponse } from '../../shared/api.js';
import type { Project, Repo } from '../../shared/schema/index.js';
import type { AppContext } from '../context.js';

export function registerCatalog(app: Hono, ctx: AppContext): void {
  app.get('/api/projects', (c) => c.json({ projects: ctx.services.projects.list() } satisfies ProjectsResponse<Project>));
  app.get('/api/repos', (c) => c.json({ repos: ctx.services.repos.list() } satisfies ReposResponse<Repo>));
}
