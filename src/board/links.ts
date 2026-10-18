// The composer's pure parts (no React, no DOM), unit-tested in test/board-evidence.test.ts: what's been added, how a
// link is classified when the server can't be asked, the evidence it becomes, and the title when nothing was typed.
import type { EvidenceFile, LinkPreview } from '../../shared/api.ts';
import { parsePrUrl } from '../../shared/links.ts';
import type { Evidence } from '../../shared/schema/index.ts';
import { stem } from './evidence.ts';

export type Pending =
  | {
      pid: number;
      kind: 'file';
      name: string;
      bytes: number;
      /** The browser's idea of its type ('' if none). */
      type: string;
      /** A local preview for pictures (an object URL), revoked when it goes. */
      preview?: string;
      status: 'uploading' | 'ready' | 'error';
      error?: string;
      evidence?: Evidence;
      file?: EvidenceFile;
      source: File;
    }
  | {
      pid: number;
      kind: 'link';
      url: string;
      status: 'loading' | 'ready';
      preview: LinkPreview;
    };

/** What a link becomes when the server couldn't be asked: the same classification, without a title or suggestions. */
export function localPreview(url: string): LinkPreview {
  const pr = parsePrUrl(url);
  if (pr) return { kind: 'github_pr', url: pr.url, repo: pr.fullName, number: pr.number, externalKey: pr.externalKey, suggestedProjects: [] };
  let domain = url;
  try {
    domain = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* shown as typed */
  }
  return { kind: 'url', url, domain };
}

/** The evidence a previewed link becomes. */
export function linkEvidence(p: LinkPreview): Omit<Evidence, 'id'> {
  return p.kind === 'github_pr'
    ? { kind: 'github_pr', url: p.url, externalKey: p.externalKey, ...(p.title ? { title: p.title } : {}) }
    : { kind: 'url', url: p.url };
}

/** A title when nothing was typed: the PR's title (or owner/repo#n), else the first file's name, else the link's domain. */
export function fallbackTitle(pending: readonly Pending[]): string {
  for (const p of pending) if (p.kind === 'link' && p.preview.kind === 'github_pr') return p.preview.title || `${p.preview.repo}#${p.preview.number}`;
  for (const p of pending) if (p.kind === 'file') return stem(p.name);
  for (const p of pending) if (p.kind === 'link' && p.preview.kind === 'url') return p.preview.domain;
  return '';
}
