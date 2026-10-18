// The composer's and the edit drawer's pickers: projects and repos (multi-select, from GET /api/projects and
// /api/repos), and impact (1–10, optional). Project and repo CRUD is the Projects page's (PR8); these only read.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { IMPACT_SCALE, impactLevel } from '../../shared/impact.ts';
import type { ProjectEntry as Project, RepoEntry as Repo } from '../../shared/api.ts';
import { ProjectPill, inputCls } from '../kit/index.ts';
import { safeColour } from '../lib/colour.ts';

/** Projects you'd pick by default: not archived and not finished. */
export const isCurrent = (p: Project) => p.status !== 'archived' && p.status !== 'done' && !p.end;

const toggle = (ids: string[], id: string) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

interface Option {
  id: string;
  label: string;
  hint?: string;
  color?: string;
}

/** A searchable checklist in a popover, behind a small button. */
function MoreMenu({ label, options, selected, onChange, testId }: { label: string; options: Option[]; selected: string[]; onChange: (ids: string[]) => void; testId: string }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), setOpen(false));
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc, true);
    };
  }, [open]);
  const f = filter.trim().toLowerCase();
  const shown = options.filter((o) => !f || o.label.toLowerCase().includes(f) || o.hint?.toLowerCase().includes(f));
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        data-testid={testId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold text-muted ring-1 ring-line hover:text-ink"
      >
        {label} <ChevronDown aria-hidden className="size-3" />
      </button>
      {open && (
        <div id={listId} className="sb-card absolute left-0 top-full z-30 mt-1.5 w-72 max-w-[80vw] rounded-xl p-2 shadow-xl">
          {options.length > 6 && (
            <input autoFocus value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" aria-label={`Filter ${label.toLowerCase()}`} className={`${inputCls} mb-1.5 py-1.5 text-[13px]`} />
          )}
          <ul className="m-0 max-h-60 list-none overflow-y-auto p-0">
            {shown.map((o) => {
              const on = selected.includes(o.id);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange(toggle(selected, o.id))}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink hover:bg-sunk"
                  >
                    <span className={`flex size-4 shrink-0 items-center justify-center rounded ring-1 ${on ? 'bg-ink text-bg ring-ink' : 'ring-line'}`}>{on && <Check aria-hidden className="size-3" />}</span>
                    {o.color && <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: safeColour(o.color) }} />}
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {o.hint && <span className="shrink-0 text-[11px] text-faint">{o.hint}</span>}
                  </button>
                </li>
              );
            })}
            {!shown.length && <li className="px-2 py-2 text-[12.5px] text-faint">{options.length ? 'Nothing matches.' : 'None yet.'}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Project pills: the chosen ones filled, current ones (and suggestions) outlined to click on, the rest behind "More".
 * Projects are made on the Projects page.
 */
export function ProjectPicker({ projects, value, onChange, suggested = [], max = 6 }: { projects: Project[]; value: string[]; onChange: (ids: string[]) => void; suggested?: string[]; max?: number }) {
  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const quick = useMemo(() => {
    const ids = [...value, ...suggested.filter((id) => !value.includes(id))];
    for (const p of projects) if (ids.length < Math.max(max, value.length) && isCurrent(p) && !ids.includes(p.id)) ids.push(p.id);
    return ids.filter((id) => byId.has(id) || value.includes(id));
  }, [projects, value, suggested, max, byId]);
  if (!projects.length && !value.length) return <span className="text-[12px] text-faint">No projects yet</span>;
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="project-picker">
      {quick.map((id) => {
        const p = byId.get(id);
        return <ProjectPill key={id} name={p?.name ?? 'Missing project'} color={p?.color ?? '#5f6b7a'} active={value.includes(id)} onClick={() => onChange(toggle(value, id))} />;
      })}
      {projects.length > quick.length && (
        <MoreMenu
          label="More projects"
          testId="project-more"
          selected={value}
          onChange={onChange}
          options={projects.map((p) => ({ id: p.id, label: p.name, color: p.color, hint: isCurrent(p) ? undefined : p.status === 'active' ? 'ended' : p.status }))}
        />
      )}
    </div>
  );
}

/** Repo chips: the chosen ones (and suggestions) as toggles, every repo behind "Repos". */
export function RepoPicker({ repos, value, onChange, suggested = [] }: { repos: Repo[]; value: string[]; onChange: (ids: string[]) => void; suggested?: string[] }) {
  const byId = useMemo(() => new Map(repos.map((r) => [r.id, r])), [repos]);
  const quick = [...value, ...suggested.filter((id) => !value.includes(id))];
  if (!repos.length && !value.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="repo-picker">
      {quick.map((id) => {
        const on = value.includes(id);
        const name = byId.get(id)?.name ?? 'missing repo';
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            title={name}
            onClick={() => onChange(toggle(value, id))}
            className={`inline-flex max-w-[16rem] items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] ${on ? 'bg-ink text-bg' : 'border border-dashed border-line text-muted'}`}
          >
            <span className="truncate">{name}</span>
            {on && <X aria-hidden className="size-3 shrink-0" />}
          </button>
        );
      })}
      {repos.length > 0 && (
        <MoreMenu
          label={quick.length ? 'More repos' : 'Repos'}
          testId="repo-more"
          selected={value}
          onChange={onChange}
          options={[...repos].filter((r) => r.tracked || value.includes(r.id)).map((r) => ({ id: r.id, label: r.name, hint: r.host === 'local' ? 'local' : undefined }))}
        />
      )}
    </div>
  );
}

/** Impact, 1–10, or none: ten small buttons (click the chosen one again to clear it), with the scale's label. */
export function ImpactPicker({ value, onChange }: { value: number | undefined; onChange: (n: number | undefined) => void }) {
  const id = useId();
  const level = impactLevel(value);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span id={id} className="text-[12px] font-semibold text-muted">
        How big?
      </span>
      <div role="radiogroup" aria-labelledby={id} className="flex items-center gap-0.5" data-testid="impact-picker">
        {IMPACT_SCALE.map((l) => {
          const on = value !== undefined && l.value <= value;
          return (
            <button
              key={l.value}
              type="button"
              role="radio"
              aria-checked={value === l.value}
              aria-label={`${l.value}: ${l.label}`}
              title={`${l.value} · ${l.label}: ${l.guidance}`}
              onClick={() => onChange(value === l.value ? undefined : l.value)}
              className={`h-5 w-3.5 rounded-[3px] transition hover:-translate-y-px ${on ? 'bg-accent' : 'bg-sunk ring-1 ring-line'}`}
            />
          );
        })}
      </div>
      <span className="min-w-[6.5rem] text-[12px] font-semibold text-muted" aria-live="polite">
        {level ? `${level.value} · ${level.label}` : 'not set'}
      </span>
    </div>
  );
}
