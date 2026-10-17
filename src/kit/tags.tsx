// Tags on a card: project pills in the project's colour, repo tags, the impact badge, and provenance badges. Ported
// from the Scrapbook prototype (ui.tsx ProjectPill, RepoTag, ImpactBadge, SourceTag; Found.tsx SourceBadge), with
// AI scores and the Slack source dropped.
import type { ReactNode } from 'react';
import { Bot, Download, ImageIcon } from 'lucide-react';
import { inkOn, safeColour } from '../lib/colour.ts';
import { GithubMark } from './icons.tsx';

/**
 * A project, in its colour, with black or white text picked automatically. `active={false}` draws it outlined (an
 * unchosen suggestion). Pass `onClick` to make it a toggle button.
 */
export function ProjectPill({ name, color, active = true, onClick }: { name: string; color: string; active?: boolean; onClick?: () => void }) {
  const c = safeColour(color);
  const style = active ? { background: c, color: inkOn(c) } : { boxShadow: `inset 0 0 0 1.5px ${c}`, color: 'var(--ink)' };
  // a faint edge in the dark theme, so a near-black project colour still reads on the dark board
  const cls = `inline-flex max-w-full min-w-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold transition ${active ? 'dark:ring-1 dark:ring-white/15' : ''}`;
  if (!onClick)
    return (
      <span className={cls} style={style} title={name}>
        <span className="truncate">{name}</span>
      </span>
    );
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`${cls} cursor-pointer hover:-translate-y-px`} style={style} title={name}>
      <span className="truncate">{name}</span>
    </button>
  );
}

/** A repo, by its short name; the full `owner/name` is the tooltip. */
export function RepoTag({ repo }: { repo: string }) {
  return (
    <span title={repo} className="rounded-md bg-sunk px-1.5 py-0.5 font-mono text-[10.5px] text-muted">
      {repo.includes('/') ? repo.slice(repo.lastIndexOf('/') + 1) : repo}
    </span>
  );
}

/** Impact on the 1–10 scale: a little gauge filled to n tenths, and the number. */
export function ImpactBadge({ n }: { n: number }) {
  const v = Math.max(0, Math.min(10, Math.round(n)));
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-faint" title={`Impact ${v} out of 10`} aria-label={`Impact ${v} out of 10`}>
      <span aria-hidden className="relative inline-block size-3.5 overflow-hidden rounded-full border border-faint/60">
        <span className="absolute inset-x-0 bottom-0 bg-accent/85" style={{ height: `${v * 10}%` }} />
      </span>
      {v}
    </span>
  );
}

/** Where something came from, when it wasn't typed in by hand (SPEC R5). */
export type Provenance = 'manual' | 'mcp' | 'github' | 'screenshot' | 'import';

interface ProvenanceMeta {
  label: (agent?: string) => string;
  /** for filter rows */
  short: string;
  /** solid badge background; text is chosen to match */
  bg: string;
  icon: (p: { className?: string }) => ReactNode;
}

export const PROVENANCE: Record<Exclude<Provenance, 'manual'>, ProvenanceMeta> = {
  github: { label: () => 'From GitHub', short: 'GitHub', bg: 'var(--ink)', icon: ({ className }) => <GithubMark className={className} /> },
  screenshot: { label: () => 'Spotted on your desktop', short: 'Screenshots', bg: '#3b6cf6', icon: ({ className }) => <ImageIcon aria-hidden className={className} /> },
  mcp: { label: (agent) => `Written by ${agent || 'an agent'}`, short: 'Agents', bg: '#7c5ce0', icon: ({ className }) => <Bot aria-hidden className={className} /> },
  import: { label: () => 'Imported', short: 'Imported', bg: '#8a6a4f', icon: ({ className }) => <Download aria-hidden className={className} /> },
};

/**
 * A provenance badge. `soft` (default) is the quiet tint used on board cards; `solid` is the bold one on Found
 * cards. Nothing for things written by hand.
 */
export function ProvenanceBadge({ source, agent, variant = 'soft' }: { source: Provenance; agent?: string; variant?: 'soft' | 'solid' }) {
  if (source === 'manual') return null;
  const m = PROVENANCE[source];
  if (variant === 'solid')
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold dark:ring-1 dark:ring-white/10 ${source === 'github' ? 'text-bg' : 'text-white'}`}
        style={{ background: m.bg }}
      >
        <m.icon className="size-3.5" /> {m.label(agent)}
      </span>
    );
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-ink"
      style={{ background: `color-mix(in oklab, ${m.bg} 16%, transparent)` }}
    >
      <m.icon className="size-3" /> {m.label(agent)}
    </span>
  );
}
