// Notebook-divider tabs (Settings, SPEC R13): a column of paper tabs on wide screens, a scrolling row on narrow ones,
// each with a coloured edge. Ported from the Scrapbook prototype's Settings.tsx tab chrome. Tabs are router links:
// the router marks the current one (`data-status="active"`, `aria-current="page"`), and the styles key off that.
import { forwardRef, type AnchorHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { createLink } from '@tanstack/react-router';

export function NotebookTabs({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={label} className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible">
      {children}
    </nav>
  );
}

interface TabAnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The tab's edge colour. */
  color: string;
}

const TabAnchor = forwardRef<HTMLAnchorElement, TabAnchorProps>(function TabAnchor({ color, className = '', children, style, ...rest }, ref) {
  return (
    <a
      ref={ref}
      {...rest}
      style={{ '--tab': color, ...style } as CSSProperties}
      className={`group relative shrink-0 rounded-xl py-2.5 pl-4 pr-4 font-grotesk text-[14.5px] font-bold text-muted no-underline transition hover:bg-surface/50 hover:text-ink lg:rounded-l-none lg:rounded-r-xl data-[status=active]:bg-surface data-[status=active]:text-ink data-[status=active]:shadow-[0_6px_16px_-10px_rgba(0,0,0,.45)] lg:data-[status=active]:translate-x-2 ${className}`}
    >
      <span aria-hidden className="absolute inset-y-1.5 left-0 w-1.5 rounded-r-full bg-[var(--tab)] opacity-45 group-data-[status=active]:opacity-100 lg:inset-y-0 lg:rounded-none" />
      {children}
    </a>
  );
});

/** `<NotebookTab to="/settings/$tab" params={{ tab: 'data' }} color="#3b6cf6">Data</NotebookTab>` */
export const NotebookTab = createLink(TabAnchor);
