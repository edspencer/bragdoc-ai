// Type: page and section titles, kickers, handwriting, and the board's week headers. Ported from the Scrapbook
// prototype (ui.tsx PageTitle and Kicker, Settings.tsx H, Board.tsx week header).
import type { ReactNode } from 'react';
import { fmt, weekLabel, type WeekGroup } from '../lib/dates.ts';

/** The big title at the top of a page, with an optional handwritten aside, a line under it, and actions on the right. */
export function PageTitle({ children, sub, hand, right }: { children: ReactNode; sub?: ReactNode; hand?: string; right?: ReactNode }) {
  return (
    <div className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-3 sm:mt-10">
      <div className="min-w-0">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
          <h1 className="m-0 font-grotesk text-[38px] font-extrabold leading-none tracking-tight break-words sm:text-[46px]">{children}</h1>
          {hand && <span className="-rotate-2 pb-1 font-hand text-[24px] leading-none text-accent">{hand}</span>}
        </div>
        {sub && <p className="m-0 mt-2.5 max-w-2xl text-[15px] leading-relaxed text-muted">{sub}</p>}
      </div>
      {right && <div className="ml-auto flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

/** A section's heading inside a page or panel. */
export function SectionTitle({ children, sub, as: Tag = 'h2' }: { children: ReactNode; sub?: ReactNode; as?: 'h2' | 'h3' }) {
  return (
    <div>
      <Tag className="m-0 font-grotesk text-[22px] font-extrabold leading-tight tracking-tight">{children}</Tag>
      {sub && <p className="m-0 mt-1 text-[13.5px] leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}

/** A small uppercase label over a group of things. */
export function Kicker({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`text-[11px] font-bold uppercase tracking-[0.12em] text-faint ${className}`}>{children}</div>;
}

/** Handwriting (Caveat): asides, captions, the voice of an empty state. */
export function Hand({ children, className = '', rotate = 0 }: { children: ReactNode; className?: string; rotate?: number }) {
  return (
    <span className={`font-hand leading-tight ${className}`} style={rotate ? { display: 'inline-block', transform: `rotate(${rotate}deg)` } : undefined}>
      {children}
    </span>
  );
}

/** A week's header on the board: "This week", then the dates and count in handwriting, then a rule. */
export function WeekHeader({ week, index = 0, today, noun = ['thing', 'things'] }: { week: WeekGroup<unknown>; index?: number; today?: string; noun?: [string, string] }) {
  const n = week.items.length;
  return (
    <div className="mb-6 flex flex-wrap items-end gap-x-4 gap-y-1">
      <h2 className="m-0 font-grotesk text-[30px] font-extrabold leading-none tracking-tight sm:text-[34px]">{weekLabel(week.start, today)}</h2>
      <Hand rotate={index % 2 ? 1.5 : -1.5} className="text-[22px] leading-none text-muted">
        {fmt.range(week.start, week.end)} · {n} {n === 1 ? noun[0] : noun[1]}
      </Hand>
      <span className="mb-2 hidden h-px flex-1 bg-line sm:block" />
    </div>
  );
}
