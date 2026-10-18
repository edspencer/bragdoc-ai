// "Tidy this up", drawn (SPEC R23): the button, the "tidying with … on …" sticky with Cancel, and the suggestion sheet
// beside your fields: Use per field and Use all, words that aren't in your text underlined, the impact with its why,
// suggested project pills, and what BragDoc left out. "Doesn't look like an achievement" fills nothing.
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import type { AiTidyField, AiTidyResponse, ProjectEntry as Project } from '../../shared/api.ts';
import { impactLevel } from '../../shared/impact.ts';
import { Btn, ProjectPill } from '../kit/index.ts';
import { fmt } from '../lib/dates.ts';
import { markUngrounded, offered, type Tidy, type TidyAvailability, type TidyKey } from './tidy.ts';

/** The button. Absent while AI or Tidy is off; disabled, with the reason, while it's on but can't run. */
export function TidyButton({ avail, tidy, can, onTidy, testId }: { avail: TidyAvailability; tidy: Tidy; can: boolean; onTidy: () => void; testId: string }) {
  if (!avail.show) return null;
  const thinking = tidy.phase.kind === 'thinking';
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Btn size="sm" kind="ink" onClick={onTidy} disabled={!avail.ready || !can || thinking} data-testid={testId} title={avail.why ?? undefined}>
        <Sparkles aria-hidden className="size-3.5" /> Tidy this up
      </Btn>
      {!avail.ready && avail.why && (
        <span className="text-[11.5px] text-muted" data-testid={`${testId}-why`}>
          {avail.why.replace(/ ?\(Settings → AI\)\.?$/, '.')}{' '}
          <Link to="/settings/$tab" params={{ tab: 'ai' }} className="font-semibold underline decoration-dotted underline-offset-2">
            Settings → AI
          </Link>
        </span>
      )}
    </span>
  );
}

/** While it thinks: which model, where, and Cancel. Then an error, in words, if it failed. */
export function TidyStatus({ tidy }: { tidy: Tidy }) {
  const p = tidy.phase;
  if (p.kind === 'thinking')
    return (
      <div className="sb-sticky relative mt-3 flex w-fit max-w-full flex-wrap items-center gap-3 px-4 py-2.5 text-[13.5px]" style={{ transform: 'rotate(-0.6deg)' }} role="status" data-testid="tidy-thinking">
        <Loader2 aria-hidden className="size-4 shrink-0 animate-spin" />
        <span className="font-hand text-[19px] leading-none">tidying{p.label ? ` with ${p.label}` : ''}…</span>
        <Btn size="sm" kind="ghost" onClick={tidy.cancel} data-testid="tidy-cancel">
          Cancel
        </Btn>
      </div>
    );
  if (p.kind === 'error')
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-sunk px-3 py-2 text-[13px]" role="alert" data-testid="tidy-error">
        <span className="min-w-0 flex-1 text-bad">{p.message}</span>
        <button type="button" onClick={tidy.close} aria-label="Dismiss" className="rounded-full p-0.5 text-faint hover:text-ink">
          <X aria-hidden className="size-3.5" />
        </button>
      </div>
    );
  return null;
}

/** A field's text with the words that aren't in your text underlined. */
function Flagged({ text, words }: { text: string; words?: string[] }) {
  return (
    <>
      {markUngrounded(text, words).map((r, i) =>
        r.flagged ? (
          <mark key={i} className="bg-transparent text-inherit underline decoration-bad decoration-wavy decoration-[1.5px] underline-offset-[3px]" title="Not in your text: check it before you use it" data-testid="tidy-ungrounded">
            {r.text}
            <span className="sr-only"> (not in your text)</span>
          </mark>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </>
  );
}

interface RowProps {
  k: TidyKey;
  label: string;
  children: ReactNode;
  field?: AiTidyField;
  used: TidyKey[];
  inert: string | null;
  onUse: (k: TidyKey) => void;
}

function Row({ k, label, children, field, used, inert, onUse }: RowProps) {
  return (
    <li className="flex items-start gap-3 border-t border-dashed border-line py-2.5 first:border-t-0" data-testid={`tidy-row-${k}`}>
      <div className="w-[68px] shrink-0 pt-0.5 text-[11px] font-bold uppercase tracking-wide text-faint">{label}</div>
      <div className="min-w-0 flex-1 text-[14px] leading-snug [overflow-wrap:anywhere]" data-field={field}>
        {children}
      </div>
      {used.includes(k) ? (
        <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-[12px] font-semibold text-good" data-testid={`tidy-used-${k}`}>
          <Check aria-hidden className="size-3.5" /> Used
        </span>
      ) : (
        <Btn size="sm" onClick={() => onUse(k)} disabled={!!inert} data-testid={`tidy-use-${k}`} aria-label={`Use the suggested ${label.toLowerCase()}`}>
          Use
        </Btn>
      )}
    </li>
  );
}

const when = (a: string, b: string | null) => (b ? fmt.range(a, b) : fmt.long(a));

/**
 * The suggestion. `inert` (AI turned off meanwhile, say) leaves it readable with every Use disabled and the reason.
 * `onUse` applies some fields; the parent marks them used.
 */
export function TidySheet({ tidy, projects, inert, saveLabel, onUse }: { tidy: Tidy; projects: Project[]; inert: string | null; saveLabel: string; onUse: (keys: TidyKey[], r: AiTidyResponse) => void }) {
  const p = tidy.phase;
  if (p.kind !== 'done') return null;
  const { r, used } = p;
  const s = r.suggestion;
  const keys = offered(r);
  const left = keys.filter((k) => !used.includes(k));
  const flagged = Object.values(r.ungrounded).some((w) => w?.length);
  const byId = new Map(projects.map((x) => [x.id, x]));
  const rowProps = { used, inert, onUse: (k: TidyKey) => onUse([k], r) };

  return (
    <section aria-label="Tidy's suggestion" className="sb-card relative mt-4 rounded-2xl p-4 text-ink" data-testid="tidy-sheet">
      <div className="flex items-start gap-2">
        <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <div className="font-grotesk text-[16px] font-bold leading-tight">{s.notAnAchievement ? 'This doesn’t look like an achievement' : 'A tidier version'}</div>
          <div className="mt-0.5 text-[11.5px] text-muted">
            Suggested by {r.model} on {r.where === 'this-computer' ? 'this computer' : r.where === 'your-network' ? 'your network' : 'the internet'}. Nothing changes until you use it, and nothing is saved until you press {saveLabel}.
          </div>
        </div>
        <button type="button" onClick={tidy.close} aria-label="Close the suggestion" className="rounded-full p-1 text-muted hover:bg-sunk hover:text-ink" data-testid="tidy-close">
          <X aria-hidden className="size-4" />
        </button>
      </div>

      {inert && (
        <p className="m-0 mt-3 rounded-xl bg-sunk p-2.5 text-[12.5px] text-warn" role="status" data-testid="tidy-inert">
          {inert}
        </p>
      )}

      {s.notAnAchievement ? (
        <p className="m-0 mt-3 text-[14px]" data-testid="tidy-not-achievement">
          {s.notAnAchievement} <span className="text-muted">Nothing was filled in.</span>
        </p>
      ) : (
        <>
          <ul className="m-0 mt-2 list-none p-0">
            {keys.includes('title') && (
              <Row {...rowProps} k="title" label="Title" field="title">
                <span className="font-semibold">
                  <Flagged text={s.title} words={r.ungrounded.title} />
                </span>
              </Row>
            )}
            {keys.includes('summary') && (
              <Row {...rowProps} k="summary" label="Summary" field="summary">
                <Flagged text={s.summary} words={r.ungrounded.summary} />
              </Row>
            )}
            {keys.includes('body') && s.body && (
              <Row {...rowProps} k="body" label="Notes" field="body">
                <span className="whitespace-pre-wrap text-[13px]">
                  <Flagged text={s.body} words={r.ungrounded.body} />
                </span>
              </Row>
            )}
            {keys.includes('dates') && s.happenedAt && (
              <Row {...rowProps} k="dates" label="When">
                {when(s.happenedAt, s.endedAt)}
              </Row>
            )}
            {keys.includes('impact') && s.impact !== null && (
              <Row {...rowProps} k="impact" label="Impact" field="impactWhy">
                <span className="font-semibold">
                  {s.impact} · {impactLevel(s.impact)?.label}
                </span>
                {s.impactWhy && (
                  <span className="block text-[12.5px] text-muted">
                    <Flagged text={s.impactWhy} words={r.ungrounded.impactWhy} />
                  </span>
                )}
              </Row>
            )}
            {keys.includes('projects') && (
              <Row {...rowProps} k="projects" label="Projects">
                <span className="flex flex-wrap gap-1.5">
                  {s.suggestedProjects.map((id) => {
                    const pr = byId.get(id);
                    return pr ? <ProjectPill key={id} name={pr.name} color={pr.color} /> : null;
                  })}
                </span>
              </Row>
            )}
          </ul>
          {!keys.length && <p className="m-0 mt-3 text-[13.5px] text-muted">It had nothing to suggest for this text.</p>}
        </>
      )}

      {(flagged || s.unclear || r.dropped.length > 0) && (
        <div className="mt-2 space-y-1 border-t-2 border-dashed border-line pt-2.5 text-[12px] text-muted">
          {flagged && (
            <p className="m-0" data-testid="tidy-flag-legend">
              <span className="underline decoration-bad decoration-wavy underline-offset-[3px]">Underlined</span>: not in your text. Check it, or leave it out.
            </p>
          )}
          {s.unclear && !s.notAnAchievement && <p className="m-0">It couldn’t tell: {s.unclear}</p>}
          {r.dropped.map((d) => (
            <p key={d} className="m-0" data-testid="tidy-dropped">
              Left out: {d}
            </p>
          ))}
        </div>
      )}

      {!s.notAnAchievement && left.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Btn size="sm" kind="accent" onClick={() => onUse(left, r)} disabled={!!inert} data-testid="tidy-use-all">
            Use all
          </Btn>
          <Btn size="sm" kind="ghost" onClick={tidy.close}>
            Keep mine
          </Btn>
        </div>
      )}
    </section>
  );
}
