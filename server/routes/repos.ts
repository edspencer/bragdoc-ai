// Repos (SPEC R6): added by hand here (a folder on this machine, or a remote URL), tagged onto projects M:N. Adding one
// by its folder reads that one repo's git config for its remote (gitremote.ts): no scan, no subprocess.
//   POST   /api/repos                    add ({ localPath?, remoteUrl?, name?, tracked? }) → 201 RepoCreateResponse
//                                         (200 with created: false when it's already there)
//   PATCH  /api/repos/:id                edit (RepoUpdateSchema; If-Match)
//   DELETE /api/repos/:id                move aside + take it off projects and achievements → DeleteResponse
//   POST   /api/repos/:id/restore        undo a delete ({ reattach }) → RepoEntry
import type { Hono } from 'hono';
import type { RepoCreateResponse } from '../../shared/api.js';
import { RepoCreateSchema, RepoUpdateSchema, RestoreSchema } from '../../shared/schema/index.js';
import type { AppContext } from '../context.js';
import { NotARepoError, readLocalRepo } from '../gitremote.js';
import { handle, jsonBody, storeError } from '../http.js';
import { tildify } from '../paths.js';
import { normalizeRemote } from '../services/catalog.js';
import { validate } from '../services/util.js';
import { ValidationError } from '../store/index.js';
import { ifMatch, repoEntry } from './entries.js';

/** A remote the user typed: one we understand, in its one spelling (no credentials survive normalising). */
function checkRemote(url: string): string {
  // `github.com/owner/repo`, as people often type it (and as the form's placeholder shows it), means https
  const typed = url.trim();
  const r = normalizeRemote(/^[\w-]+(\.[\w-]+)+\/[^\s:]+$/.test(typed) ? `https://${typed}` : typed);
  if (!r) throw new ValidationError(`"${url}" isn't a repository URL BragDoc understands (try github.com/owner/repo)`, [{ key: 'remoteUrl', message: 'not a repository URL' }]);
  return r.url;
}

/** A folder the user typed: a git checkout, as `~/…` where it's under home, plus the remote its config names. */
function checkFolder(folder: string): { localPath: string; remoteUrl: string | null } {
  try {
    const { path, remoteUrl } = readLocalRepo(folder);
    // a remote we can't normalise (a local path, an unusual scheme) is left out rather than stored as typed: it could
    // carry credentials (https://user:token@…)
    return { localPath: tildify(path.replace(/[\\/]+$/, '') || path), remoteUrl: remoteUrl ? (normalizeRemote(remoteUrl)?.url ?? null) : null };
  } catch (e) {
    if (e instanceof NotARepoError) throw new ValidationError(e.message, [{ key: 'localPath', message: e.code }]);
    throw e;
  }
}

export function registerRepos(app: Hono, ctx: AppContext): void {
  const { store, services } = ctx;
  const entry = (v: Parameters<typeof repoEntry>[1]) => repoEntry(store, v);

  app.post('/api/repos', async (c) => {
    try {
      const v = validate(RepoCreateSchema, await jsonBody(c.req));
      const remoteUrl = v.remoteUrl ? checkRemote(v.remoteUrl) : undefined;
      const local = v.localPath ? checkFolder(v.localPath) : undefined;
      let { repo, created } = services.repos.create({ ...v, localPath: local?.localPath, remoteUrl: remoteUrl ?? local?.remoteUrl ?? undefined });
      // the same remote, known so far without a folder: this is its checkout, so remember where it is
      if (!created && local && !repo.localPath) repo = services.repos.update(repo.id, { localPath: local.localPath });
      return c.json({ repo: entry(repo), created } satisfies RepoCreateResponse, created ? 201 : 200);
    } catch (e) {
      const r = storeError(e);
      return c.json(r.body, r.status);
    }
  });

  app.get('/api/repos/:id', (c) => handle(c, () => entry(services.repos.get(c.req.param('id')))));

  app.patch('/api/repos/:id', (c) =>
    handle(c, async () => {
      const v = validate(RepoUpdateSchema, await jsonBody(c.req));
      const patch = { ...v };
      if (v.remoteUrl) patch.remoteUrl = checkRemote(v.remoteUrl);
      if (v.localPath) patch.localPath = checkFolder(v.localPath).localPath;
      return entry(services.repos.update(c.req.param('id'), patch, ifMatch(c.req)));
    }),
  );

  app.delete('/api/repos/:id', (c) => handle(c, () => services.repos.removeAndDetach(c.req.param('id'), ifMatch(c.req))));

  app.post('/api/repos/:id/restore', (c) =>
    handle(c, async () => {
      const { reattach } = validate(RestoreSchema, await jsonBody(c.req));
      return entry(services.repos.restoreAndReattach(c.req.param('id'), reattach));
    }),
  );

}
