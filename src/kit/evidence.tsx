// Evidence on a card: photo prints, PDF pages, file chips, link cards, PR slabs and quote stickies (SPEC R5). Ported
// from the Scrapbook prototype (ui.tsx PrSlab, EvidenceBit). The kit draws a small view model, EvidenceView, rather
// than the stored evidence schema (shared/schema/, PR3): the board maps one to the other, and builds the image URLs.
import { FileText, Link2, Paperclip } from 'lucide-react';
import { fmt } from '../lib/dates.ts';
import { GithubMark } from './icons.tsx';
import { PdfPage, Print, StickyQuote } from './paper.tsx';

export type EvidenceView =
  | { kind: 'image'; src: string; alt: string; caption?: string }
  | { kind: 'pdf'; title: string; pages?: number; bytes?: number; href?: string }
  | { kind: 'file'; name: string; bytes?: number; href?: string }
  | { kind: 'link'; url: string; title?: string }
  /** `title` is missing when GitHub isn't connected: the slab shows `owner/repo#n` instead. */
  | { kind: 'github_pr'; repo: string; number: number; title?: string; url?: string; mergedAt?: string; additions?: number; deletions?: number }
  | { kind: 'quote'; text: string; from?: string; where?: string };

/** 1.2 MB, 340 KB, 12 B */
export function formatBytes(n: number): string {
  if (n < 1000) return `${n} B`;
  if (n < 1_000_000) return `${Math.round(n / 1000)} KB`;
  return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0)} MB`;
}

/** The host of a URL without `www.`, or the URL itself if it doesn't parse. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Links leave the app in a new tab, and tell the other site nothing about where they came from. */
const OUT = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** A merged pull request, as a dark slab: title (or `owner/repo#n`), repo, number, merge date, lines changed. */
export function PrSlab({ repo, number, title, url, mergedAt, additions, deletions }: Omit<Extract<EvidenceView, { kind: 'github_pr' }>, 'kind'>) {
  const short = repo.slice(repo.lastIndexOf('/') + 1);
  const body = (
    <>
      <GithubMark className="size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">{title || `${repo}#${number}`}</div>
        <div className="truncate text-[11px] opacity-60">
          {short} #{number}
          {mergedAt && ` · merged ${fmt.short(mergedAt)}`}
        </div>
      </div>
      {additions !== undefined && deletions !== undefined && (
        <div className="shrink-0 font-mono text-[10.5px]">
          <span className="text-[#6fe0a7]">+{additions}</span> <span className="text-[#ff9b85]">−{deletions}</span>
        </div>
      )}
    </>
  );
  const cls = 'flex items-center gap-3 rounded-xl bg-slab px-3.5 py-3 text-slab-ink no-underline ring-1 ring-white/5';
  return url ? (
    <a href={url} {...OUT} className={`${cls} hover:ring-white/20`}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** A web link, as a dashed card: its title (if known) and domain. BragDoc never fetches it (SPEC R5). */
export function LinkCard({ url, title }: { url: string; title?: string }) {
  return (
    <a href={url} {...OUT} className="flex items-center gap-2.5 rounded-xl border-2 border-dashed border-line px-3 py-2.5 text-ink no-underline hover:border-faint">
      <Link2 aria-hidden className="size-4 shrink-0 text-accent" />
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold">{title || domainOf(url)}</div>
        <div className="truncate text-[11px] text-faint">{title ? domainOf(url) : url}</div>
      </div>
    </a>
  );
}

/** A PDF: a drawn first page beside its title, page count and size. */
export function PdfChip({ title, pages, bytes, href }: { title: string; pages?: number; bytes?: number; href?: string }) {
  const meta = [pages !== undefined && `${pages} ${pages === 1 ? 'page' : 'pages'}`, bytes !== undefined && formatBytes(bytes)].filter(Boolean).join(' · ');
  const body = (
    <>
      <PdfPage title={title} className="h-24 w-[72px] shrink-0" />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold leading-snug">
          <FileText aria-hidden className="size-3.5 shrink-0 text-muted" />
          <span className="break-words">{title}</span>
        </div>
        {meta && <div className="text-[11px] text-faint">{meta}</div>}
      </div>
    </>
  );
  return href ? (
    <a href={href} className="flex items-center gap-3 rounded-lg text-ink no-underline">
      {body}
    </a>
  ) : (
    <div className="flex items-center gap-3">{body}</div>
  );
}

/** Any other file: a paperclip chip with its name and size. */
export function FileChip({ name, bytes, href }: { name: string; bytes?: number; href?: string }) {
  const body = (
    <>
      <Paperclip aria-hidden className="size-3.5 shrink-0 text-muted" />
      <span className="truncate font-medium">{name}</span>
      {bytes !== undefined && <span className="ml-auto shrink-0 text-[11px] text-faint">{formatBytes(bytes)}</span>}
    </>
  );
  const cls = 'flex items-center gap-2 rounded-xl bg-sunk px-3 py-2 text-[12.5px] text-ink no-underline';
  return href ? (
    <a href={href} className={`${cls} hover:ring-1 hover:ring-line`}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** One piece of evidence, drawn the way its kind is drawn. `id` keeps a print's tilt stable. */
export function EvidenceBit({ e, id }: { e: EvidenceView; id: string }) {
  switch (e.kind) {
    case 'image':
      return <Print src={e.src} alt={e.alt} caption={e.caption} tiltId={id} />;
    case 'github_pr':
      return <PrSlab {...e} />;
    case 'link':
      return <LinkCard url={e.url} title={e.title} />;
    case 'pdf':
      return <PdfChip title={e.title} pages={e.pages} bytes={e.bytes} href={e.href} />;
    case 'file':
      return <FileChip name={e.name} bytes={e.bytes} href={e.href} />;
    case 'quote':
      return <StickyQuote text={e.text} from={e.from} where={e.where} />;
  }
}
