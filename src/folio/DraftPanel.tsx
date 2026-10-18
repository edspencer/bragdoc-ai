// Folio's Draft panel (SPEC R24, D81): the draft streaming in (with the time it's taken, and Cancel), then a textarea
// that's yours to edit, with the check's flags under it (click one: its line is selected) and each [n] linking back to
// its clipping. Copy draft and Export draft .md take it away from the page; Draft again asks for a new one. It's a
// suggestion: it never replaces the plain export, which stays exactly what you picked.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Copy, Download, RotateCcw, Square, X } from 'lucide-react';
import type { AiDraftCited, AiDraftFlag } from '../../shared/api.ts';
import { HOST_CLASS_LABEL } from '../../shared/ai/hosts.ts';
import { draftExportName, flagCount } from '../../shared/ai/draft.ts';
import { Btn, Hand, Kicker, TextArea, useToast } from '../kit/index.ts';
import { elapsed, lineRange, type DraftState } from './draft.ts';
import { copyText, download } from './take.ts';

const CITE = /(\[\d{1,4}(?:\s*,\s*\d{1,4})*\])/g;

/** The draft's text with each [n] a link to its clipping (while it streams in, and in Read). */
function Cited({ text, cited, onCite }: { text: string; cited: AiDraftCited[]; onCite: (id: string) => void }) {
  const parts: ReactNode[] = [];
  text.split(CITE).forEach((part, i) => {
    if (i % 2 === 0) parts.push(part);
    else
      parts.push(
        <span key={i}>
          [
          {part
            .slice(1, -1)
            .split(',')
            .map((s, j, all) => {
              const n = Number(s.trim());
              const c = cited.find((x) => x.n === n);
              return (
                <span key={j}>
                  {c ? (
                    <button type="button" onClick={() => onCite(c.id)} title={c.title} className="font-semibold text-accent underline decoration-dotted underline-offset-2" data-testid="draft-cite">
                      {n}
                    </button>
                  ) : (
                    <span className="font-semibold text-bad" title="no clipping has this number">
                      {n}
                    </span>
                  )}
                  {j < all.length - 1 ? ', ' : ''}
                </span>
              );
            })}
          ]
        </span>,
      );
  });
  return <>{parts}</>;
}

function Flags({ title, flags, onLine, testId, render }: { title: string; flags: AiDraftFlag[]; onLine: (line: number) => void; testId: string; render?: (f: AiDraftFlag) => string }) {
  if (!flags.length) return null;
  return (
    <div data-testid={testId}>
      <div className="text-[12px] font-bold text-warn">{title}</div>
      <ul className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
        {flags.map((f, i) => (
          <li key={i}>
            <button type="button" onClick={() => onLine(f.line)} className="rounded-full bg-warn/15 px-2.5 py-0.5 text-left text-[12px] ring-1 ring-warn/40 hover:bg-warn/25" data-testid="draft-flag">
              <span className="font-mono text-faint">line {f.line}</span> {render ? render(f) : f.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface DraftPanelProps {
  d: DraftState;
  /** Draft is on and ready: Draft again is offered. */
  canDraft: boolean;
  /** Why not, when Draft is on but not ready (or off: AI was switched off). */
  why: string | null;
  /** The folio on the page is no longer the one this draft was made from. */
  changed: boolean;
  onEdit: (text: string) => void;
  onCancel: () => void;
  onAgain: () => void;
  onDiscard: () => void;
  onTaken: () => void;
  onCite: (id: string) => void;
}

export function DraftPanel({ d, canDraft, why, changed, onEdit, onCancel, onAgain, onDiscard, onTaken, onCite }: DraftPanelProps) {
  const toast = useToast();
  const area = useRef<HTMLTextAreaElement>(null);
  const [now, setNow] = useState(Date.now());
  const running = d.phase === 'waiting' || d.phase === 'streaming';
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  const took = (d.endedAt ?? now) - d.startedAt;
  const s = d.start;
  const where = s ? HOST_CLASS_LABEL[s.where] : null;
  const [view, setView] = useState<'edit' | 'read'>('edit');

  const onLine = (line: number) => {
    setView('edit');
    requestAnimationFrame(() => {
      const ta = area.current;
      if (!ta) return;
      const [a, b] = lineRange(ta.value, line);
      ta.focus();
      ta.setSelectionRange(a, b);
      // put the selected line in view: roughly, by its share of the text
      const lh = parseFloat(getComputedStyle(ta).lineHeight) || 20;
      ta.scrollTop = Math.max(0, (line - 3) * lh);
    });
  };

  async function copy() {
    if (await copyText(d.text)) {
      onTaken();
      toast({ msg: 'Copied the draft as markdown. Check every line before you use it.' });
    } else toast({ msg: 'Your browser wouldn’t let BragDoc copy. Use Export draft .md instead.', tone: 'bad' });
  }
  const exportIt = () => {
    download(draftExportName(d.folio), d.text.endsWith('\n') ? d.text : `${d.text}\n`);
    onTaken();
  };

  const c = d.check;
  const n = c ? flagCount(c) : 0;
  const settled = !running;

  return (
    <section className="sb-card mt-4 rounded-2xl p-5 print:hidden" aria-label="Draft with AI" data-testid="folio-draft">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Kicker>Draft · a suggestion</Kicker>
        {s && (
          <span className="text-[12px] text-muted" data-testid="draft-model">
            <span className="font-mono font-semibold">{s.model}</span> on {where}
          </span>
        )}
        <span className="ml-auto font-mono text-[12px] text-faint" data-testid="draft-elapsed">
          {elapsed(took)}
        </span>
      </div>

      {s && s.omitted > 0 && (
        <p className="m-0 mt-2 rounded-xl bg-sunk px-3 py-2 text-[12.5px]" role="status" data-testid="draft-omitted">
          <b>
            {s.omitted} lower-impact {s.omitted === 1 ? 'item wasn’t' : 'items weren’t'} sent
          </b>{' '}
          (the {s.sent} highest-impact {s.sent === 1 ? 'one was' : 'ones were'}, to fit the model’s context). Narrow the window or raise the minimum impact to include {s.omitted === 1 ? 'it' : 'them'}.
        </p>
      )}
      {changed && settled && (
        <p className="m-0 mt-2 text-[12.5px] text-muted" data-testid="draft-changed">
          The folio has changed since this draft: its [n] still mean the clippings it was made from.
        </p>
      )}

      {running && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2 text-[13px]" role="status" aria-live="polite" data-testid="draft-status">
            <span className="size-2 animate-pulse rounded-full bg-accent" aria-hidden />
            {d.phase === 'waiting'
              ? s
                ? `Waiting for ${s.model} on ${where}${s.ahead ? ` (${s.ahead} ${s.ahead === 1 ? 'call' : 'calls'} ahead)` : ''}… A model on a computer without a GPU can take a few minutes to start.`
                : 'Starting…'
              : `Writing with ${s?.model ?? 'the model'} on ${where ?? '…'}…`}
            <Btn size="sm" kind="paper" className="ml-auto" onClick={onCancel} data-testid="draft-cancel">
              <Square aria-hidden className="size-3.5" /> Cancel
            </Btn>
          </div>
          {d.text && (
            <div className="mt-3 max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-sunk p-4 font-mono text-[12.5px] leading-relaxed" data-testid="draft-stream">
              <Cited text={d.text} cited={s?.cited ?? []} onCite={onCite} />
            </div>
          )}
        </div>
      )}

      {settled && d.error && (
        <div className="mt-3 rounded-xl bg-bad/10 px-3 py-2 text-[13px] ring-1 ring-bad/30" role="alert" data-testid="draft-error">
          {d.phase === 'cancelled' ? 'Cancelled.' : d.error.message}
          {d.error.code === 'ai_off' || d.error.code === 'no_model' || d.error.code === 'not_consented' || d.error.code === 'no_key' ? (
            <>
              {' '}
              <Link to="/settings/$tab" params={{ tab: 'ai' }} className="font-semibold underline">
                Settings → AI
              </Link>
            </>
          ) : null}
          {d.text ? <span className="text-muted"> What arrived so far is below, for you to keep or drop.</span> : null}
        </div>
      )}
      {settled && !d.error && d.phase === 'cancelled' && (
        <p className="m-0 mt-3 text-[13px] text-muted" role="status" data-testid="draft-error">
          Cancelled{d.text ? ': what arrived so far is below, for you to keep or drop.' : '. Nothing was written.'}
        </p>
      )}

      {settled && d.text && (
        <div className="mt-3">
          <div className="mb-2 flex gap-1" role="group" aria-label="Draft view">
            <Btn size="sm" kind={view === 'edit' ? 'ink' : 'ghost'} onClick={() => setView('edit')} aria-pressed={view === 'edit'}>
              Edit
            </Btn>
            <Btn size="sm" kind={view === 'read' ? 'ink' : 'ghost'} onClick={() => setView('read')} aria-pressed={view === 'read'} data-testid="draft-read">
              Read, with links
            </Btn>
          </div>
          {view === 'edit' ? (
            <TextArea ref={area} value={d.text} onChange={(e) => onEdit(e.target.value)} rows={16} aria-label="The draft, to edit" spellCheck className="max-h-[70vh] font-mono text-[12.5px] leading-relaxed" data-testid="draft-text" />
          ) : (
            <div className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-sunk p-4 font-mono text-[12.5px] leading-relaxed" data-testid="draft-readview">
              <Cited text={d.text} cited={s?.cited ?? []} onCite={onCite} />
            </div>
          )}
        </div>
      )}

      {settled && c && d.text && (
        <div className="mt-3 space-y-2.5" data-testid="draft-check">
          {n === 0 ? (
            <p className="m-0 text-[12.5px] text-good" data-testid="draft-check-clean">
              Every bullet cites a clipping, and every number, date and name is in what it cites. Still read it through: the check can’t tell whether a sentence is fair.
            </p>
          ) : (
            <p className="m-0 text-[12.5px] text-muted">
              {n} {n === 1 ? 'thing' : 'things'} to look at before you use it. Click one to select its line.
            </p>
          )}
          <Flags title="Not in the clippings it cites" flags={c.ungrounded} onLine={onLine} testId="draft-ungrounded" />
          <Flags title="No citation" flags={c.uncited} onLine={onLine} testId="draft-uncited" render={(f) => (f.text.length > 60 ? `${f.text.slice(0, 59)}…` : f.text)} />
          <Flags title="Filler" flags={c.filler} onLine={onLine} testId="draft-filler" render={(f) => `“${f.text}”`} />
          <Flags title="Cites a clipping that wasn’t sent" flags={c.badCitations} onLine={onLine} testId="draft-badcites" />
        </div>
      )}

      {settled && d.text && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Btn kind="paper" size="sm" onClick={() => void copy()} data-testid="draft-copy">
            <Copy aria-hidden className="size-3.5" /> Copy draft
          </Btn>
          <Btn kind="go" size="sm" onClick={exportIt} data-testid="draft-export">
            <Download aria-hidden className="size-3.5" /> Export draft .md
          </Btn>
          {canDraft && (
            <Btn kind="ghost" size="sm" onClick={onAgain} data-testid="draft-again">
              <RotateCcw aria-hidden className="size-3.5" /> Draft again
            </Btn>
          )}
          <Btn kind="ghost" size="sm" className="ml-auto" onClick={onDiscard} data-testid="draft-discard">
            <X aria-hidden className="size-3.5" /> Discard
          </Btn>
        </div>
      )}
      {settled && !d.text && (
        <div className="mt-3 flex flex-wrap gap-2">
          {canDraft && (
            <Btn kind="paper" size="sm" onClick={onAgain} data-testid="draft-again">
              <RotateCcw aria-hidden className="size-3.5" /> Try again
            </Btn>
          )}
          <Btn kind="ghost" size="sm" onClick={onDiscard} data-testid="draft-discard">
            Close
          </Btn>
        </div>
      )}
      {settled && !canDraft && why && d.text && (
        <p className="m-0 mt-2 text-[12px] text-muted" data-testid="draft-ai-off">
          {why} This draft stays here, yours to edit, copy or export, until you leave the page.
        </p>
      )}

      {s && settled && d.text && (
        <details className="mt-4 text-[12.5px]">
          <summary className="cursor-pointer font-semibold text-muted">What each number cites ({s.cited.length})</summary>
          <ol className="m-0 mt-1.5 list-none space-y-0.5 p-0">
            {s.cited.map((x) => (
              <li key={x.n}>
                <button type="button" onClick={() => onCite(x.id)} className="text-left hover:underline">
                  <span className="font-mono text-faint">[{x.n}]</span> {x.title}
                </button>
              </li>
            ))}
          </ol>
        </details>
      )}

      <Hand className="mt-4 block text-[16px] text-muted">
        a suggestion from {s ? s.model : 'a model'}: check it against your clippings. Copy, Print and Export .md above still give exactly what you picked.
      </Hand>
    </section>
  );
}
