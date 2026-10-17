// Links the board understands (SPEC R5): a GitHub pull request URL becomes `github_pr` evidence keyed
// `github_pr:owner/repo#n`; any other http(s) URL is link evidence, shown by its domain and never fetched. Used by the
// composer (to classify a paste), by POST /api/link-preview, and by anything that needs a PR's key from its URL.
// Adapted from the Scrapbook prototype's shared/composer.ts (PR_RE, URL_RE).

/** github.com/<owner>/<repo>/pull/<n>, with anything after it (`/files`, `#discussion…`, a query). */
const PR_RE = /^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})\/pull\/(\d{1,9})(?:[/?#].*)?$/i;

export interface PrRef {
  owner: string;
  repo: string;
  number: number;
  /** `owner/repo` */
  fullName: string;
  /** The canonical URL, without anything after the number. */
  url: string;
  /** `github_pr:owner/repo#n`: what makes adding the same PR twice a no-op. */
  externalKey: string;
}

/** The pull request a URL points at, or null. */
export function parsePrUrl(text: string): PrRef | null {
  const m = PR_RE.exec(text.trim());
  if (!m) return null;
  const [, owner, repo, n] = m;
  const number = Number(n);
  if (!number) return null;
  const fullName = `${owner}/${repo}`;
  return { owner, repo, number, fullName, url: `https://github.com/${fullName}/pull/${number}`, externalKey: `github_pr:${fullName}#${number}` };
}

/** True for one http(s) URL and nothing else (no spaces, no other text around it). */
export function isHttpUrl(text: string): boolean {
  const t = text.trim();
  if (!/^https?:\/\/\S+$/i.test(t)) return false;
  try {
    const u = new URL(t);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.hostname;
  } catch {
    return false;
  }
}

/** `owner/repo` of a GitHub remote (https, ssh or scp-style), lower case; null for anything else. */
export function githubRepoOf(remote: string | undefined): string | null {
  if (!remote) return null;
  const m = /^(?:https?:\/\/|ssh:\/\/git@|git@)(?:www\.)?github\.com[/:]([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/i.exec(remote.trim());
  return m ? `${m[1]}/${m[2]}`.toLowerCase() : null;
}

/** The `owner/repo` and number in a `github_pr:owner/repo#n` key, or null. */
export function parsePrKey(key: string | undefined): { fullName: string; number: number } | null {
  const m = /^github_pr:([^#\s]+\/[^#\s]+)#(\d+)$/.exec(key ?? '');
  return m ? { fullName: m[1], number: Number(m[2]) } : null;
}
