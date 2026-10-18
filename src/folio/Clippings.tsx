// Folio's clippings: every achievement the filters let through, best first, each a tick box. Unticking one leaves it
// out of the document. Adapted from the Scrapbook prototype's Folio.tsx (its clippings list).
import { Check } from 'lucide-react';
import type { FolioItem, FolioProject } from '../../shared/folio.ts';
import { whenOf } from '../../shared/folio.ts';
import { ImpactBadge } from '../kit/index.ts';
import { safeColour } from '../lib/colour.ts';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Clipping({ a, on, projects, toggle }: { a: FolioItem; on: boolean; projects: Map<string, FolioProject>; toggle: (id: string) => void }) {
  const p = a.projects.map((id) => projects.get(id)).find(Boolean);
  const names = a.projects.map((id) => projects.get(id)?.name).filter(Boolean);
  return (
    <li className="folio-clip">
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        onClick={() => toggle(a.id)}
        data-testid="folio-clip"
        className={`sb-card relative flex w-full items-start gap-3 rounded-xl p-3.5 pl-5 text-left transition ${on ? '' : 'opacity-45'}`}
      >
        {/* a faint edge in the dark theme, so a near-black project colour still shows (as ProjectPill does) */}
        <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 rounded-l-xl dark:ring-1 dark:ring-white/15" style={{ background: p ? safeColour(p.color) : 'var(--line)' }} />
        <span aria-hidden className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md ring-2 ${on ? 'bg-good text-[#10241a] ring-good' : 'ring-line'}`}>
          {on && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words font-grotesk text-[15px] font-bold leading-snug">{a.title}</span>
          <span className="mt-0.5 block text-[11.5px] font-semibold text-faint">
            {[whenOf(a), names.length ? names.join(', ') : 'No project', a.evidence.length ? plural(a.evidence.length, 'evidence', 'evidence') : ''].filter(Boolean).join(' · ')}
          </span>
        </span>
        {a.impact ? <ImpactBadge n={a.impact} /> : <span className="text-[11px] font-semibold text-faint">unrated</span>}
      </button>
    </li>
  );
}
