// Folio's filter panel: when (presets and a custom window), projects, company, minimum impact, and how the document is
// grouped. Adapted from the Scrapbook prototype's Folio.tsx (its filter card), with company and grouping added.
import type { ReactNode } from 'react';
import { IMPACT_SCALE } from '../../shared/impact.ts';
import { GROUPS, NO_PROJECT, presets, type FolioFilter, type FolioGroup, type FolioItem, type FolioResponse } from '../../shared/folio.ts';
import { FilterChip, Kicker, ProjectPill, inputCls } from '../kit/index.ts';

const GROUP_LABEL: Record<FolioGroup, string> = { project: 'Project', month: 'Month', week: 'Week' };
const NO_PROJECT_COLOUR = '#9a9186';

function Row({ label, children, id }: { label: string; children: ReactNode; id?: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center" role="group" aria-labelledby={id}>
      <span id={id}>
        <Kicker className="w-24 shrink-0">{label}</Kicker>
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Filters({ f, set, data, inWindow, today }: { f: FolioFilter; set: (patch: Partial<FolioFilter>) => void; data: FolioResponse | undefined; inWindow: FolioItem[]; today: string }) {
  const ps = presets(today);
  const projects = data?.projects ?? [];
  const companies = data?.companies ?? [];
  // the pills: projects with something in the window (busiest first), plus any the URL picked, so it can be unpicked
  const counts = new Map<string, number>();
  let none = 0;
  for (const a of inWindow) {
    if (!a.projects.length) none++;
    for (const p of a.projects) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const shown = projects.filter((p) => counts.has(p.id) || f.projects.includes(p.id)).sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name));
  const pillIds = [...shown.map((p) => p.id), ...(none || f.projects.includes(NO_PROJECT) ? [NO_PROJECT] : [])];
  const allOn = !f.projects.length;
  const toggleProject = (id: string) => {
    const cur = allOn ? pillIds : f.projects;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    // everything on again (or nothing left) means no filter
    set({ projects: next.length === 0 || pillIds.every((x) => next.includes(x)) ? [] : next });
  };
  const projectCompany = new Map(projects.map((p) => [p.id, p.companyId]));
  const companyIds = new Set<string>();
  for (const a of inWindow) {
    if (a.companyId) companyIds.add(a.companyId);
    for (const p of a.projects) {
      const c = projectCompany.get(p);
      if (c) companyIds.add(c);
    }
  }
  const shownCompanies = companies.filter((c) => companyIds.has(c.id) || c.id === f.company);
  const level = IMPACT_SCALE.find((l) => l.value === f.minImpact);

  return (
    <div className="sb-card mt-8 space-y-4 rounded-3xl p-5" data-testid="folio-filters">
      <Row label="When" id="folio-when">
        {ps.map((p) => (
          <FilterChip key={p.id} label={p.label} on={f.from === p.from && f.to === p.to} onClick={() => set({ from: p.from, to: p.to })} />
        ))}
        <span className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <input
            type="date"
            aria-label="From"
            data-testid="folio-from"
            value={f.from}
            max={f.to}
            onChange={(e) => e.target.value && set({ from: e.target.value })}
            className={`${inputCls} min-w-0 flex-1 py-1.5 text-[13px] sm:!w-auto sm:flex-none`}
          />
          <span aria-hidden className="text-faint">
            →
          </span>
          <input
            type="date"
            aria-label="To"
            data-testid="folio-to"
            value={f.to}
            min={f.from}
            onChange={(e) => e.target.value && set({ to: e.target.value })}
            className={`${inputCls} min-w-0 flex-1 py-1.5 text-[13px] sm:!w-auto sm:flex-none`}
          />
        </span>
      </Row>
      <Row label="Projects" id="folio-projects">
        {pillIds.length === 0 ? (
          <span className="text-[13px] text-faint">None in this window.</span>
        ) : (
          <>
            {shown.map((p) => (
              <ProjectPill key={p.id} name={`${p.name} · ${counts.get(p.id) ?? 0}`} color={p.color} active={allOn || f.projects.includes(p.id)} onClick={() => toggleProject(p.id)} />
            ))}
            {pillIds.includes(NO_PROJECT) && <ProjectPill name={`No project · ${none}`} color={NO_PROJECT_COLOUR} active={allOn || f.projects.includes(NO_PROJECT)} onClick={() => toggleProject(NO_PROJECT)} />}
            {!allOn && (
              <button type="button" onClick={() => set({ projects: [] })} className="text-[12.5px] font-semibold text-accent hover:underline">
                All projects
              </button>
            )}
          </>
        )}
      </Row>
      {shownCompanies.length > 0 && (
        <Row label="Company" id="folio-company">
          <FilterChip label="Any" on={!f.company} onClick={() => set({ company: undefined })} />
          {shownCompanies.map((c) => (
            <FilterChip key={c.id} label={c.name} on={f.company === c.id} onClick={() => set({ company: f.company === c.id ? undefined : c.id })} />
          ))}
        </Row>
      )}
      <Row label="At least" id="folio-impact">
        <input
          type="range"
          min={0}
          max={10}
          value={f.minImpact}
          aria-label="Minimum impact"
          data-testid="folio-min-impact"
          onChange={(e) => set({ minImpact: Number(e.target.value) })}
          className="w-40 accent-[var(--accent)]"
        />
        <span className="text-[13px] font-semibold" data-testid="folio-min-impact-label">
          {f.minImpact ? `impact ${f.minImpact}${level ? ` · ${level.label}` : ''}` : 'any impact, unrated too'}
        </span>
      </Row>
      <Row label="Group by" id="folio-group">
        {GROUPS.map((g) => (
          <FilterChip key={g} label={GROUP_LABEL[g]} on={f.group === g} onClick={() => set({ group: g })} />
        ))}
      </Row>
    </div>
  );
}
