// Stored evidence (shared/schema Evidence + the sidecars the API sends alongside) → what the kit draws (EvidenceView).
import type { EvidenceFile } from '../../shared/api.ts';
import { isHttpUrl, parsePrKey, parsePrUrl } from '../../shared/links.ts';
import type { Evidence } from '../../shared/schema/index.ts';
import { evidenceUrl } from '../api/client.ts';
import type { EvidenceView } from '../kit/evidence-view.ts';

/** A name for a file without its extension: `Q3 review.pdf` → `Q3 review`. */
export const stem = (name: string) => name.replace(/\.[a-z0-9]{1,10}$/i, '') || name;

/** The names browsers give a pasted picture (`image.png`, `blob`): not worth writing under a print. */
const GENERIC = /^(?:image|blob|pasted picture|untitled|clipboard)$/i;

export function toView(e: Evidence, files: Record<string, EvidenceFile>): EvidenceView {
  const file = e.blob ? files[e.blob] : undefined;
  const name = e.title || file?.name;
  switch (e.kind) {
    case 'image':
      if (!e.blob) break;
      return {
        kind: 'image',
        src: evidenceUrl(e.blob, true),
        full: evidenceUrl(e.blob),
        alt: name && !GENERIC.test(stem(name)) ? stem(name) : 'A pasted picture',
        ...(e.title ? { caption: e.title } : name && !GENERIC.test(stem(name)) ? {} : { caption: 'pasted' }),
      };
    case 'pdf':
      if (!e.blob) break;
      return { kind: 'pdf', title: name ? stem(name) : 'A PDF', bytes: file?.bytes, href: evidenceUrl(e.blob) };
    case 'file':
      if (!e.blob) break;
      return { kind: 'file', name: name || 'A file', bytes: file?.bytes, href: evidenceUrl(e.blob) };
    case 'url':
      // only http(s) is ever a link: a hand-edited `javascript:` (or `file:`) URL is shown, never made clickable
      if (e.url && isHttpUrl(e.url)) return { kind: 'link', url: e.url, title: e.title };
      if (e.url) return { kind: 'file', name: e.title || e.url };
      break;
    case 'github_pr': {
      const ref = parsePrKey(e.externalKey) ?? (e.url ? parsePrUrl(e.url) : null);
      const meta = (e.meta ?? {}) as { mergedAt?: unknown; additions?: unknown; deletions?: unknown };
      if (ref)
        return {
          kind: 'github_pr',
          repo: ref.fullName,
          number: ref.number,
          title: e.title,
          // the link is built from the PR it names, never taken from `url`: a slab that says acme/app#12 goes there
          url: `https://github.com/${ref.fullName}/pull/${ref.number}`,
          ...(typeof meta.mergedAt === 'string' ? { mergedAt: meta.mergedAt } : {}),
          ...(typeof meta.additions === 'number' && typeof meta.deletions === 'number' ? { additions: meta.additions, deletions: meta.deletions } : {}),
        };
      if (e.url && isHttpUrl(e.url)) return { kind: 'link', url: e.url, title: e.title };
      break;
    }
    case 'quote':
      if (e.quote) return { kind: 'quote', text: e.quote.text, from: e.quote.from, where: e.quote.where };
      break;
  }
  // something incomplete (a hand edit): say what it is rather than draw nothing
  return { kind: 'file', name: name || `${e.kind} evidence (incomplete)` };
}

/** A one-line description of a piece of evidence, for lists (the edit drawer). */
export function describe(e: Evidence, files: Record<string, EvidenceFile>): string {
  const v = toView(e, files);
  switch (v.kind) {
    case 'image':
      return v.alt;
    case 'pdf':
      return v.title;
    case 'file':
      return v.name;
    case 'link':
      return v.title || v.url;
    case 'github_pr':
      return v.title || `${v.repo}#${v.number}`;
    case 'quote':
      return `“${v.text}”`;
  }
}
