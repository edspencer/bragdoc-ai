// The project, company and repo routes' views of the store's entities: the value plus its file's ETag (for If-Match),
// and for projects how many achievements carry it. Shared by routes/{projects,companies,repos}.ts.
import type { CompanyEntry, ProjectEntry, RepoEntry } from '../../shared/api.js';
import type { Company, Project, Repo } from '../../shared/schema/index.js';
import type { Store } from '../store/index.js';

const etag = (store: Store, kind: 'project' | 'company' | 'repo', id: string) => store.entry(kind, id)?.etag ?? '';

export const projectEntry = (store: Store, p: Project): ProjectEntry => ({ ...p, etag: etag(store, 'project', p.id), achievements: store.achievementIdsIn('project', p.id).size });
export const companyEntry = (store: Store, c: Company): CompanyEntry => ({ ...c, etag: etag(store, 'company', c.id) });
export const repoEntry = (store: Store, r: Repo): RepoEntry => ({ ...r, etag: etag(store, 'repo', r.id) });

/** The `If-Match` header, if the client sent one. */
export const ifMatch = (req: { header: (name: string) => string | undefined }) => ({ ifMatch: req.header('if-match') || undefined });
