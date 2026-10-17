// The Projects page's timeline (SPEC R6): company swimlanes (plus "No company"), month gridlines labelled with the year
// at each New Year, a hand-written "today!" marker, chunky clickable bars in each project's colour (striped while
// ongoing), packed into as few rows as don't overlap. It scrolls sideways when the screen is narrower than the chart,
// starting scrolled to today. Adapted from the Scrapbook prototype's Projects.tsx; the maths is src/lib/gantt.ts.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CompanyEntry, ProjectEntry } from '../../shared/api.ts';
import { inkOn, safeColour } from '../lib/colour.ts';
import { fmt } from '../lib/dates.ts';
import { bar, chartWidth, fitWindow, gridlines, labelPlacement, labelWidth, pct, swimlanes } from '../lib/gantt.ts';

/** Width of the company column, px: narrower on a phone, where the chart scrolls under it. */
const labelWidthFor = (vw: number) => (vw < 640 ? 124 : 168);

export function Gantt({
  projects,
  companies,
  today,
  selected,
  onSelect,
  onEditCompany,
}: {
  projects: ProjectEntry[];
  companies: CompanyEntry[];
  today: string;
  selected?: string;
  onSelect: (id: string) => void;
  onEditCompany: (c: CompanyEntry) => void;
}) {
  const w = useMemo(() => fitWindow(projects, today), [projects, today]);
  const lines = useMemo(() => gridlines(w), [w]);
  const lanes = useMemo(() => swimlanes(projects, companies, today), [projects, companies, today]);
  const width = chartWidth(w);
  const todayLeft = pct(w, today);
  const scroller = useRef<HTMLDivElement>(null);
  const [LABEL_W, setLabelW] = useState(() => (typeof window === 'undefined' ? 168 : labelWidthFor(window.innerWidth)));
  useEffect(() => {
    const on = () => setLabelW(labelWidthFor(window.innerWidth));
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const track = useRef<HTMLDivElement>(null);
  // the track's real width (the chart stretches to fill a wide screen), for deciding where a short bar's name fits
  const [trackPx, setTrackPx] = useState(width);
  useEffect(() => {
    const el = track.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setTrackPx(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // on a narrow screen, start with today in view (most of what matters is recent)
  useEffect(() => {
    const s = scroller.current;
    if (!s || s.scrollWidth <= s.clientWidth) return;
    s.scrollLeft = Math.max(0, LABEL_W + (todayLeft / 100) * width - s.clientWidth * 0.75);
  }, [todayLeft, width, LABEL_W]);

  return (
    <div ref={scroller} className="mt-8 overflow-x-auto rounded-3xl pb-2" data-testid="gantt" tabIndex={-1}>
      <div className="sb-card relative rounded-3xl pb-11 pr-6 pt-11" style={{ width: LABEL_W + width + 24, minWidth: '100%' }}>
        {/* the grid and today line, over the track area only */}
        <div ref={track} className="pointer-events-none absolute inset-y-0 right-6" style={{ left: LABEL_W }} aria-hidden>
          {lines.map((g) => (
            <div key={g.date} className={`absolute bottom-6 top-11 border-l-2 ${g.major ? 'border-solid border-faint/45' : 'border-dotted border-line'}`} style={{ left: `${g.left}%` }}>
              {g.year && <span className="absolute -top-6 ml-2 whitespace-nowrap font-grotesk text-[12px] font-extrabold tracking-wide text-muted">{g.year}</span>}
              <span className={`absolute -top-1 ml-2 whitespace-nowrap font-grotesk text-[13px] font-bold ${g.major ? 'text-muted' : 'text-faint'}`}>{g.label}</span>
            </div>
          ))}
          <div className="absolute bottom-4 top-11 z-10 w-[3px] -translate-x-1/2 rounded-full bg-accent" style={{ left: `${todayLeft}%` }} data-testid="gantt-today">
            <span className="absolute -bottom-1 left-2 rotate-[-6deg] whitespace-nowrap font-hand text-[22px] leading-none text-accent">today!</span>
          </div>
        </div>

        <div className="pt-7">
          {/* the corner over the company column, so month labels scrolled under it don't show through */}
          <div aria-hidden className="pointer-events-none sticky left-0 z-20 -mt-[4.5rem] h-[4.5rem] rounded-tl-3xl bg-surface" style={{ width: LABEL_W }} />
          {lanes.map((lane) => (
            <div key={lane.company?.id ?? 'none'} className="relative mt-4 flex items-stretch first:mt-0" data-testid="gantt-lane">
              <div className="sticky left-0 z-20 shrink-0 bg-surface py-1 pl-4 pr-3 sm:pl-6 sm:pr-4" style={{ width: LABEL_W }}>
                {lane.company ? (
                  <button
                    type="button"
                    onClick={() => onEditCompany(lane.company!)}
                    className="group block w-full text-left"
                    title={`Edit ${lane.company.name}`}
                    data-testid="gantt-company"
                  >
                    <span className="block break-words font-grotesk text-[13px] font-extrabold leading-tight group-hover:underline line-clamp-2 sm:text-[16px]">{lane.company.name}</span>
                    {lane.company.role && <span className="mt-0.5 block text-[11.5px] leading-snug text-faint line-clamp-2">{lane.company.role}</span>}
                  </button>
                ) : (
                  <span className="block font-grotesk text-[13px] font-extrabold italic sm:text-[16px] leading-tight text-muted">No company</span>
                )}
              </div>
              <div className="relative min-w-0 flex-1 space-y-2 rounded-2xl bg-sunk/60 py-2.5">
                {lane.rows.length === 0 && <div className="flex h-10 items-center px-4 font-hand text-[19px] text-faint">no projects here yet</div>}
                {lane.rows.map((row, i) => (
                  <div key={i} className="relative h-10">
                    {row.map((p, j) => {
                      const b = bar(w, p, today);
                      const next = row[j + 1] ? bar(w, row[j + 1], today).left : 100;
                      const prev = j > 0 ? bar(w, row[j - 1], today) : null;
                      const place = labelPlacement(b, labelWidth(p.name), trackPx, next, prev ? prev.left + prev.width : 0);
                      const c = safeColour(p.color);
                      const ink = inkOn(c);
                      const active = p.id === selected;
                      const archived = p.status === 'archived';
                      const dates = `${fmt.long(p.start)} to ${p.end ? fmt.long(p.end) : 'now (ongoing)'}`;
                      return (
                        <span key={p.id}>
                        {place !== 'inside' && (
                          <span
                            aria-hidden
                            onClick={() => onSelect(p.id)}
                            className={`absolute inset-y-0 flex cursor-pointer items-center whitespace-nowrap px-2 font-grotesk text-[13px] font-bold ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}
                            style={place === 'after' ? { left: `${b.left + b.width}%` } : { right: `${100 - b.left}%` }}
                          >
                            {p.name}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelect(p.id)}
                          aria-pressed={active}
                          aria-label={`${p.name}: ${dates}${archived ? ' (archived)' : ''}`}
                          title={`${p.name}\n${dates}`}
                          data-testid="gantt-bar"
                          data-project={p.id}
                          className={`absolute inset-y-0 flex min-w-0 items-center overflow-hidden rounded-xl px-3 font-grotesk text-[13.5px] font-bold ring-1 ring-black/10 transition hover:z-10 hover:-translate-y-0.5 dark:ring-white/15 ${active ? 'z-10 shadow-[0_4px_0_rgba(0,0,0,.22)]' : 'opacity-75 hover:opacity-100'} ${archived ? 'opacity-40 grayscale-[.4]' : ''}`}
                          style={{
                            left: `${b.left}%`,
                            width: `${b.width}%`,
                            color: ink,
                            backgroundColor: c,
                            // stripes in the text's colour, faint: they show on any colour, white and black included
                            backgroundImage: b.ongoing ? `repeating-linear-gradient(-45deg, transparent 0 10px, ${ink}2e 10px 20px)` : undefined,
                            outline: active ? `3px solid ${c}80` : undefined,
                            outlineOffset: 2,
                          }}
                        >
                          {place === 'inside' && <span className="truncate">{p.name}</span>}
                          {b.ongoing && (
                            <span aria-hidden className="ml-1.5 shrink-0 opacity-80">
                              →
                            </span>
                          )}
                        </button>
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
