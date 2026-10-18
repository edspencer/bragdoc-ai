// The project and repo lists, which the Board's pills (PR7) and the Projects page (PR8) both read:
//   GET /api/projects   every project, newest start first (ProjectsResponse)
//   GET /api/repos      every repo, by name (ReposResponse)
// Each item carries its file's ETag, for If-Match on edits (routes/projects.ts, routes/repos.ts).
import type { Hono } from 'hono';
import type { ProjectsResponse, ReposResponse } from '../../shared/api.js';
import type { AppContext } from '../context.js';
import { projectEntry, repoEntry } from './entries.js';

export function registerCatalog(app: Hono, ctx: AppContext): void {
  const { store, services } = ctx;
  app.get('/api/projects', (c) => c.json({ projects: services.projects.list().map((p) => projectEntry(store, p)) } satisfies ProjectsResponse));
  app.get('/api/repos', (c) => c.json({ repos: services.repos.list().map((r) => repoEntry(store, r)) } satisfies ReposResponse));
}
