// Import from the hosted BragDoc (SPEC R12): the panel for Settings → Data's import slot. Choose (or drop) the export
// file, see the dry run (what would be added, what's already here, what can't be imported, what's left behind and
// why), then Import; the result says what happened. Nothing is written until Import is pressed, and importing the
// same file again adds nothing. The server does the work (POST /api/import/{plan,apply}); this only shows it.
import { useRef, useState, type DragEvent } from 'react';
import { FileUp, RotateCw } from 'lucide-react';
import type { ImportKind, ImportReport } from '../../shared/api.ts';
import { applyImport, isApiError, planImport } from '../api/client.ts';
import { Btn, Dot, Kicker, LinkBtn, Panel, SectionTitle } from '../kit/index.ts';

type State =
  | { at: 'idle' }
  | { at: 'reading'; file: File }
  | { at: 'planned'; file: File; report: ImportReport }
  | { at: 'importing'; file: File; report: ImportReport }
  | { at: 'done'; file: File; report: ImportReport }
  | { at: 'failed'; file: File | null; message: string; report?: ImportReport };

const ROWS: [ImportKind, string][] = [
  ['companies', 'Companies'],
  ['projects', 'Projects'],
  ['repos', 'Repos'],
  ['achievements', 'Achievements'],
  ['documents', 'Documents'],
  ['reviews', 'Performance reviews'],
];

/** Problems shown before "Show all". */
const SHOWN = 8;

const total = (r: ImportReport, f: 'add' | 'skip' | 'fail') => ROWS.reduce((n, [k]) => n + r.counts[k][f], 0);
const plural = (n: number, one: string, many = one + 's') => `${n.toLocaleString()} ${n === 1 ? one : many}`;
const messageOf = (e: unknown) => (isApiError(e) ? (e.code === 'network' ? 'BragDoc didn’t answer. Is it still running?' : e.message) : 'Something went wrong reading that file.');

export function ImportPanel() {
  const [state, setState] = useState<State>({ at: 'idle' });
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setState({ at: 'reading', file });
    try {
      setState({ at: 'planned', file, report: await planImport(file) });
    } catch (e) {
      setState({ at: 'failed', file, message: messageOf(e) });
    }
  };
  const run = async (file: File, report: ImportReport) => {
    setState({ at: 'importing', file, report });
    try {
      setState({ at: 'done', file, report: await applyImport(file) });
    } catch (e) {
      setState({ at: 'failed', file, message: messageOf(e), report });
    }
  };
  const reset = () => {
    setState({ at: 'idle' });
    if (input.current) input.current.value = '';
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void choose(e.dataTransfer.files[0]);
  };
  const busy = state.at === 'reading' || state.at === 'importing';

  return (
    <Panel tape="#3b6cf6" className="md:col-span-2">
      <div data-testid="import-panel" onDragOver={(e) => (e.preventDefault(), setOver(true))} onDragLeave={() => setOver(false)} onDrop={drop}>
        <SectionTitle as="h3" sub="Bring your companies, projects, achievements and documents over from the hosted app. Export them there (Account → Export Data), then choose the file here. You’ll see what would come in before anything is written, and importing the same file again adds nothing.">
          Import from the hosted BragDoc
        </SectionTitle>
        <input ref={input} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} aria-hidden data-testid="import-file" onChange={(e) => void choose(e.target.files?.[0])} />

        {(state.at === 'idle' || state.at === 'reading') && (
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className={`mt-4 flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors ${over ? 'border-accent bg-accent/10' : 'border-line bg-sunk/60 hover:border-faint'}`}
            data-testid="import-choose"
          >
            <FileUp className="size-5 text-muted" aria-hidden />
            <span className="text-[14px] font-semibold">{state.at === 'reading' ? `Reading ${state.file.name}…` : 'Choose the export file, or drop it here'}</span>
            <span className="text-[12.5px] text-muted">bragdoc-export-&lt;date&gt;.json, up to 50 MB. It stays on this computer.</span>
          </button>
        )}

        {state.at === 'failed' && (
          <div className="mt-4 rounded-2xl bg-bad/10 p-4 ring-1 ring-bad/40" role="alert" data-testid="import-error">
            <div className="flex items-center gap-2 text-[14px] font-semibold">
              <Dot tone="bad" /> {state.report ? 'The import didn’t finish' : `Can’t import ${state.file?.name ?? 'that file'}`}
            </div>
            <p className="m-0 mt-1.5 break-words text-[13.5px] leading-relaxed">{state.message}</p>
            {state.report && <p className="m-0 mt-1.5 text-[13px] text-muted">Whatever was imported before it stopped is safe to keep: importing the file again adds only what’s missing.</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {state.report && state.file && (
                <Btn size="sm" kind="accent" onClick={() => void run(state.file!, state.report!)}>
                  <RotateCw className="size-3.5" aria-hidden /> Try again
                </Btn>
              )}
              <Btn size="sm" onClick={reset} data-testid="import-reset">
                Choose another file
              </Btn>
            </div>
          </div>
        )}

        {(state.at === 'planned' || state.at === 'importing' || state.at === 'done') && <Report state={state} onImport={() => void run(state.file, state.report)} onReset={reset} />}
      </div>
    </Panel>
  );
}

function Report({ state, onImport, onReset }: { state: Extract<State, { at: 'planned' | 'importing' | 'done' }>; onImport: () => void; onReset: () => void }) {
  const { report: r, file } = state;
  const done = state.at === 'done';
  const [all, setAll] = useState(false);
  const adds = total(r, 'add');
  const errors = r.problems.filter((p) => p.level === 'error').length;
  const problems = all ? r.problems : r.problems.slice(0, SHOWN);
  return (
    <div className="mt-4 space-y-4" data-testid={done ? 'import-done' : 'import-plan'}>
      <div className="text-[13.5px]">
        {done ? (
          <span className="flex items-center gap-2 font-semibold">
            <Dot tone="good" /> {adds ? `Imported ${file.name}.` : `Nothing new in ${file.name}: everything in it was already here.`}
          </span>
        ) : (
          <span>
            <b>{file.name}</b>
            {r.exportedAt ? `, exported ${new Date(r.exportedAt).toLocaleDateString()}` : ''}. Nothing has been written yet.
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[22rem] border-collapse text-[13.5px]" data-testid="import-counts">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-[0.1em] text-faint">
              <th className="py-1 pr-3 font-bold" />
              <th className="py-1 pr-3 text-right font-bold">{done ? 'Added' : 'Would add'}</th>
              <th className="py-1 pr-3 text-right font-bold">Already here</th>
              <th className="py-1 text-right font-bold">Can’t import</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([k, label]) => {
              const c = r.counts[k];
              return (
                <tr key={k} className="border-t border-line" data-testid={`import-row-${k}`}>
                  <td className="py-1.5 pr-3 font-semibold">{label}</td>
                  <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{c.add.toLocaleString()}</td>
                  <td className="py-1.5 pr-3 text-right font-mono tabular-nums text-muted">{c.skip.toLocaleString()}</td>
                  <td className={`py-1.5 text-right font-mono tabular-nums ${c.fail ? 'font-bold text-bad' : 'text-muted'}`}>{c.fail.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {r.problems.length > 0 && (
        <div data-testid="import-problems">
          <Kicker>
            {[errors && `${plural(errors, 'item')} can’t be imported`, r.problems.length - errors && `${plural(r.problems.length - errors, 'item')} ${done ? 'came in' : 'will come in'} with a change`].filter(Boolean).join(' · ')}
          </Kicker>
          <ul className="m-0 mt-2 list-none space-y-1.5 p-0">
            {problems.map((p, i) => (
              <li key={i} className="flex gap-2 rounded-xl bg-sunk px-3 py-2 text-[13px] leading-snug" data-testid="import-problem" data-level={p.level}>
                <span className="mt-1.5">
                  <Dot tone={p.level === 'error' ? 'bad' : 'warn'} label={p.level === 'error' ? 'Not imported' : 'Imported with a change'} />
                </span>
                <span className="min-w-0 break-words">
                  <b>{p.item}</b>: {p.message}
                </span>
              </li>
            ))}
          </ul>
          {r.problems.length > SHOWN && (
            <Btn size="sm" kind="ghost" className="mt-1 !px-0" onClick={() => setAll(!all)}>
              {all ? 'Show fewer' : `Show all ${r.problems.length}`}
            </Btn>
          )}
        </div>
      )}

      {r.dropped.length > 0 && (
        <details className="text-[13px]" data-testid="import-dropped">
          <summary className="cursor-pointer font-semibold text-muted">Left behind: {plural(r.dropped.length, 'field')} BragDoc has no place for</summary>
          <ul className="m-0 mt-2 space-y-1 pl-5 text-muted">
            {r.dropped.map((d) => (
              <li key={d.field}>
                <code className="font-mono text-[12px] text-ink">{d.field}</code> ({plural(d.count, 'item')}): {d.why}.
              </li>
            ))}
          </ul>
        </details>
      )}

      {r.importsDir && (
        <p className="m-0 text-[13px] text-muted">
          Documents and reviews {done ? 'went' : 'will go'} to <code className="font-mono text-[12px]">{r.importsDir}/</code> in your data folder, as read-only markdown.
        </p>
      )}
      {done && r.snapshot && (
        <p className="m-0 text-[13px] text-muted" data-testid="import-snapshot">
          A copy of your data from just before the import is in <code className="font-mono text-[12px]">{r.snapshot}/</code>.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!done && (
          <Btn kind="accent" disabled={state.at === 'importing' || adds === 0} onClick={onImport} data-testid="import-go">
            {state.at === 'importing' ? 'Importing…' : adds ? 'Import' : 'Nothing new to import'}
          </Btn>
        )}
        {done && adds > 0 && (
          <LinkBtn to="/" kind="accent">
            See the board
          </LinkBtn>
        )}
        <Btn disabled={state.at === 'importing'} onClick={onReset} data-testid="import-reset">
          {done ? 'Import another file' : 'Cancel'}
        </Btn>
      </div>
    </div>
  );
}
