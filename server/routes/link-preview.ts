// POST /api/link-preview { url } → LinkPreview: what a pasted URL becomes on the board (SPEC R5).
//
// - A GitHub pull request → `github_pr` evidence keyed `github_pr:owner/repo#n`, with the repo it matches in repos/ and
//   the projects linked to that repo (the composer suggests them). Its title only if a GitHub source is connected
//   (ctx.linkPreviews, registered by PR13; its requests go through egress and are logged). Not connected: no request
//   at all, and the card shows `owner/repo#n`.
// - Any other http(s) URL → its domain. It is never fetched: no title scraping, no favicon, nothing.
import type { Hono } from 'hono';
import type { LinkPreview } from '../../shared/api.js';
import { githubRepoOf, isHttpUrl, parsePrUrl } from '../../shared/links.js';
import type { AppContext } from '../context.js';
import { apiError } from '../http.js';

export function registerLinkPreview(app: Hono, ctx: AppContext): void {
  app.post('/api/link-preview', async (c) => {
    let url: unknown;
    try {
      url = ((await c.req.json()) as { url?: unknown } | null)?.url;
    } catch {
      return c.json(apiError('invalid', 'The body is not valid JSON.'), 400);
    }
    if (typeof url !== 'string' || url.length > 4096 || !isHttpUrl(url)) return c.json(apiError('invalid', 'Send { "url": "https://…" }: one http(s) link.'), 400);
    const pr = parsePrUrl(url);
    if (!pr) return c.json({ kind: 'url', url: url.trim(), domain: new URL(url.trim()).hostname.replace(/^www\./, '') } satisfies LinkPreview);
    const name = pr.fullName.toLowerCase();
    const repo = ctx.services.repos.list().find((r) => githubRepoOf(r.remoteUrl) === name || r.name.toLowerCase() === name);
    const suggestedProjects = repo ? ctx.services.projects.forRepo(repo.id).filter((p) => p.status !== 'archived').map((p) => p.id) : [];
    const onBoard = ctx.store.achievementIdByKey(pr.externalKey);
    const looked = await ctx.linkPreviews.pr(pr);
    return c.json({
      kind: 'github_pr',
      url: pr.url,
      repo: pr.fullName,
      number: pr.number,
      externalKey: pr.externalKey,
      ...('details' in looked ? { title: looked.details.title } : { titleNote: looked.note }),
      ...(repo ? { repoId: repo.id } : {}),
      suggestedProjects,
      ...(onBoard ? { onBoard } : {}),
    } satisfies LinkPreview);
  });
}
