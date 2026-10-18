// The app's chrome: the header (mark, pill nav with the Found badge, theme toggle, settings) and, below 768 px, a
// floating tab bar at the bottom instead of the pill nav. Ported from the Scrapbook prototype's Scrapbook.tsx. Its AI
// chip shows only while AI is on (SPEC R26: "AI · this computer", "AI · Anthropic", linking to Settings → AI); with AI
// off, the header says nothing about AI at all (D8).
import { forwardRef, type AnchorHTMLAttributes, type CSSProperties } from 'react';
import { Link, createLink, useRouterState } from '@tanstack/react-router';
import { Settings, Sparkles } from 'lucide-react';
import { CountBadge } from '../kit/index.ts';
import { inkOn } from '../lib/colour.ts';
import { useAi, useFoundCount } from '../api/queries.ts';
import { chipLabel } from '../settings/ai/words.ts';
import { Mark, Wordmark } from './Logo.tsx';
import { NAV } from './nav.ts';
import { ThemeToggle } from './ThemeToggle.tsx';

interface PillAnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  color: string;
}

/** A nav link that fills with its colour when it's the current page (the router sets data-status="active"). */
const PillAnchor = forwardRef<HTMLAnchorElement, PillAnchorProps>(function PillAnchor({ color, className = '', style, ...rest }, ref) {
  return <a ref={ref} {...rest} style={{ '--nav': color, '--nav-ink': inkOn(color), ...style } as CSSProperties} className={`no-underline transition data-[status=active]:bg-[var(--nav)] data-[status=active]:text-[var(--nav-ink)] ${className}`} />;
});
const NavPill = createLink(PillAnchor);

export function Header() {
  const found = useFoundCount();
  const inSettings = useRouterState({ select: (s) => s.location.pathname.startsWith('/settings') });
  return (
    <header className="mx-auto flex max-w-[1240px] items-center gap-x-5 gap-y-3 px-4 pt-5 sm:px-6 sm:pt-6">
      <Link to="/" aria-label="BragDoc, the board" className="flex shrink-0 items-center gap-2 rounded-lg no-underline">
        <Mark />
        <Wordmark />
      </Link>
      <nav aria-label="Main" className="sb-glass hidden items-center gap-1.5 rounded-full p-1 shadow-[0_1px_0_rgba(0,0,0,.04),0_4px_14px_-8px_rgba(0,0,0,.35)] md:flex">
        {NAV.map((n) => (
          <NavPill key={n.to} to={n.to} color={n.color} activeOptions={{ exact: n.to === '/' }} className="group flex items-center gap-1.5 rounded-full px-4 py-1.5 font-grotesk text-[14px] font-semibold text-muted hover:text-ink">
            {n.label}
            {n.to === '/found' && !!found && <CountBadge n={found} className="bg-warn text-[#2a1a00] group-data-[status=active]:bg-white/40 group-data-[status=active]:text-[var(--nav-ink)]" />}
          </NavPill>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <AiChip />
        <ThemeToggle />
        <Link
          to="/settings/$tab"
          params={{ tab: 'sources' }}
          aria-label="Settings"
          title="Settings"
          // lit on every settings tab, not only the one it links to
          className={`flex size-9 items-center justify-center rounded-full no-underline shadow-[0_4px_14px_-8px_rgba(0,0,0,.35)] ${inSettings ? 'bg-ink text-bg' : 'sb-glass text-muted hover:text-ink'}`}
        >
          <Settings aria-hidden className="size-[18px]" />
        </Link>
      </div>
    </header>
  );
}

/** "AI · this computer": only while AI is on. */
function AiChip() {
  const label = chipLabel(useAi().data);
  if (!label) return null;
  return (
    <Link
      to="/settings/$tab"
      params={{ tab: 'ai' }}
      title={`${label}: Settings → AI`}
      data-testid="ai-chip"
      className="sb-glass flex h-9 items-center gap-1.5 rounded-full px-3 font-grotesk text-[12.5px] font-bold text-ink no-underline shadow-[0_4px_14px_-8px_rgba(0,0,0,.35)] ring-1 ring-good/50"
    >
      <Sparkles aria-hidden className="size-3.5 text-good" />
      <span className="max-sm:sr-only">{label}</span>
    </Link>
  );
}

export function MobileTabs() {
  const found = useFoundCount();
  return (
    <nav
      aria-label="Main"
      data-testid="mobile-tabs"
      className="sb-glass fixed inset-x-3 bottom-3 z-30 flex items-center justify-around gap-1 rounded-2xl px-1 py-1.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,.5)] ring-1 ring-line backdrop-blur md:hidden"
    >
      {NAV.map((n) => (
        <NavPill key={n.to} to={n.to} color={n.color} activeOptions={{ exact: n.to === '/' }} className="relative flex flex-1 flex-col items-center rounded-xl py-1.5 font-grotesk text-[13px] font-bold text-muted">
          {n.label}
          {n.to === '/found' && !!found && <CountBadge n={found} className="absolute right-1 top-0.5 bg-warn text-[10px] text-[#2a1a00]" />}
        </NavPill>
      ))}
    </nav>
  );
}
