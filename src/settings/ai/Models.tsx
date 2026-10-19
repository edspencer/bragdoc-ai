// Models (SPEC R18): which model the features use (the text slot), and Recommended for this computer: the readings
// it's based on, each labelled for what it is, and the recommended models with their size, the RAM they want, whether
// they're installed, and the `ollama pull` command to copy. "Ask Ollama to download it" (open question 1: yes) opens a
// confirm that restates the download size, the free space in your home folder and the RAM, then shows Ollama's progress
// with Cancel. Nothing is downloaded without that confirm (principle 2); the server refuses a pull without it too.
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import type { AiConnectionView, AiHardware, AiPullEvent, AiStatus } from '../../../shared/api.ts';
import { MIN_LOCAL_RAM_GB, RECOMMENDED_MODELS, type RecommendedModel } from '../../../shared/ai/models.ts';
import { isApiError, pullAiModel, putAi } from '../../api/client.ts';
import { queryKeys, useAiHardware, useAiModels } from '../../api/queries.ts';
import { Btn, Dialog, Kicker, useToast } from '../../kit/index.ts';
import { CommandSlab, CopyButton } from '../common.tsx';
import { connectionName, gb, ramGb } from './words.ts';

export function TextSlot({ status }: { status: AiStatus }) {
  const qc = useQueryClient();
  const toast = useToast();
  const clear = useMutation({
    mutationFn: () => putAi({ text: null }),
    onSuccess: (s) => qc.setQueryData(queryKeys.ai, s),
    onError: (e) => toast({ msg: isApiError(e) ? e.message : 'That didn’t save.', tone: 'bad' }),
  });
  const t = status.text;
  const c = t ? status.connections.find((x) => x.id === t.connection) : undefined;
  return (
    <div className="rounded-2xl bg-surface/70 p-4 text-[13.5px] ring-1 ring-line" data-testid="ai-text-slot">
      <Kicker>The model AI features use</Kicker>
      {t && c ? (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span>
            <span className="font-mono font-semibold" data-testid="ai-text-slot-model">{t.model}</span> on {connectionName(c)} ({c.class === 'internet' ? c.host : c.class === 'this-computer' ? 'this computer' : 'your network'})
          </span>
          <Btn size="sm" kind="ghost" onClick={() => clear.mutate()} disabled={clear.isPending}>
            Clear
          </Btn>
        </div>
      ) : (
        <div className="mt-1 text-muted">None yet. Pick one on a connection above (“Use for AI features”). A feature can also choose its own.</div>
      )}
    </div>
  );
}

export function Recommended({ status }: { status: AiStatus }) {
  const hw = useAiHardware(true);
  // the Ollama a download would go to: the one you pick here (with more than one), else the one in use, else the first.
  // A pick lasts while the page is open, even if another runner becomes the one in use; a removed one falls back.
  const ollamas = status.connections.filter((c) => c.kind === 'ollama');
  const [picked, setPicked] = useState<string | null>(null);
  const target = ollamas.find((c) => c.id === picked) ?? ollamas.find((c) => c.id === status.text?.connection) ?? ollamas[0];
  // a runner on the internet is asked only on a click (on its card), never by opening the page (D69)
  const models = useAiModels(target?.id ?? '-', target?.baseUrl ?? null, !!target && !target.blocked && !target.cloud);
  const installed = new Set(models.data?.models.map((m) => m.name) ?? []);
  if (hw.isPending) return <div className="text-[13px] text-faint">Reading this computer…</div>;
  if (hw.isError || !hw.data) return <div className="text-[13px] text-bad">Couldn’t read this computer’s hardware.</div>;
  const h = hw.data;
  const ram = ramGb(h.ramBytes);
  return (
    <div className="space-y-4" data-testid="ai-recommended">
      <Readings h={h} />
      <p className="m-0 max-w-3xl text-[13.5px] leading-relaxed" data-testid="ai-recommendation">
        {h.recommended ? (
          <>
            With {ram} GB of RAM, start with <span className="font-mono font-semibold">{h.recommended}</span>.{h.speedNote ? ` ${h.speedNote}` : ''}
          </>
        ) : (
          <>A local model will struggle with under {MIN_LOCAL_RAM_GB} GB of RAM. Consider a cloud provider, or leave AI off.</>
        )}
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {RECOMMENDED_MODELS.map((m) => (
          <ModelRow key={m.name} m={m} h={h} recommended={m.name === h.recommended} installed={installed.has(m.name)} known={models.isSuccess} target={target && !target.blocked && models.isSuccess ? target : undefined} />
        ))}
      </div>
      <p className="m-0 text-[12px] text-faint">
        Recommendations as of {h.modelsAsOf}, from measurements on a laptop CPU.{' '}
        {!target ? (
          'Add an Ollama connection to see what’s installed.'
        ) : ollamas.length > 1 ? (
          <>
            Installed means installed on{' '}
            <select value={target.id} onChange={(e) => setPicked(e.target.value)} className="rounded-lg bg-sunk px-2 py-0.5 text-[12px] text-ink outline-none ring-2 ring-transparent focus-visible:ring-accent/60" aria-label="Which Ollama" data-testid="ai-recommended-target">
              {ollamas.map((c) => (
                <option key={c.id} value={c.id}>
                  {/* two runners with the same name (two unnamed Ollamas) are told apart by address */}
                  {ollamas.some((o) => o !== c && connectionName(o) === connectionName(c)) ? `${connectionName(c)} (${c.baseUrl ?? c.host})` : connectionName(c)}
                </option>
              ))}
            </select>
            .
          </>
        ) : (
          `Installed means installed on ${connectionName(target)}.`
        )}
      </p>
    </div>
  );
}

function Readings({ h }: { h: AiHardware }) {
  return (
    <div className="space-y-1.5" data-testid="ai-hardware">
      <dl className="m-0 grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-[auto_1fr]">
        <dt className="text-muted">RAM</dt>
        <dd className="m-0 font-semibold" data-testid="ai-hardware-ram">{ramGb(h.ramBytes)} GB</dd>
        <dt className="text-muted">Processor</dt>
        <dd className="m-0">
          {h.cpu}, {h.cores} cores ({h.arch}{h.appleSilicon ? ', Apple silicon' : ''})
        </dd>
        <dt className="text-muted">Free space in your home folder</dt>
        <dd className="m-0" data-testid="ai-hardware-disk">{h.freeDiskBytes == null ? 'couldn’t tell' : gb(h.freeDiskBytes)}</dd>
      </dl>
      <p className="m-0 text-[12px] text-faint">
        {h.inDocker
          ? 'These are the readings inside this container, not your computer’s: Docker may give it less than the machine has.'
          : 'Read from this computer, never sent anywhere. Free space is your home folder’s, where Ollama keeps models by default: BragDoc can’t know where a runner stores them.'}
      </p>
    </div>
  );
}

function ModelRow({ m, h, recommended, installed, known, target }: { m: RecommendedModel; h: AiHardware; recommended: boolean; installed: boolean; known: boolean; target: AiConnectionView | undefined }) {
  const [asking, setAsking] = useState(false);
  const cmd = `ollama pull ${m.name}`;
  return (
    <div className={`rounded-2xl p-4 ring-1 ${recommended ? 'bg-surface ring-2 ring-good/60' : 'bg-surface/70 ring-line'}`} data-testid={`ai-model-${m.name}`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-[14px] font-bold">{m.name}</span>
        {recommended && <span className="text-[11px] font-bold uppercase text-good">for this computer</span>}
        <span className="ml-auto text-[12px] text-muted" data-testid="ai-model-state">
          {!known ? '' : installed ? 'installed' : 'not installed'}
        </span>
      </div>
      <div className="mt-1 text-[12.5px] text-muted">
        Download {m.downloadGb ? `about ${m.downloadGb} GB` : 'larger (it varies)'} · wants {m.ramGb} GB of RAM
      </div>
      <div className="mt-0.5 text-[12.5px] leading-snug">{m.note}</div>
      {!installed && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 rounded-xl bg-slab py-1.5 pl-3 pr-1.5">
            <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-slab-ink">{cmd}</code>
            <CopyButton text={cmd} what={`the ${m.name} download command`} onSlab />
          </div>
          {target && m.downloadGb && (
            <Btn size="sm" onClick={() => setAsking(true)} data-testid={`ai-pull-${m.name}`}>
              <Download className="size-3.5" aria-hidden /> Ask Ollama to download it
            </Btn>
          )}
        </div>
      )}
      {asking && target && <PullDialog m={m} h={h} target={target} onClose={() => setAsking(false)} />}
    </div>
  );
}

type PullState = { phase: 'confirm' } | { phase: 'pulling'; status: string; completed?: number; total?: number } | { phase: 'done' } | { phase: 'failed'; message: string } | { phase: 'cancelled' };

/** The confirm (size, free disk, RAM), then Ollama's progress with Cancel. */
function PullDialog({ m, h, target, onClose }: { m: RecommendedModel; h: AiHardware; target: AiConnectionView; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [state, setState] = useState<PullState>({ phase: 'confirm' });
  const ctl = useRef<AbortController | null>(null);
  const pulling = useRef(false);
  // the dialog can vanish mid-download (AI switched off in another tab hides the whole setup): say what happened
  useEffect(
    () => () => {
      if (pulling.current) toast({ msg: `The download of ${m.name} stopped: AI was switched off, or you left the page.`, tone: 'bad' });
      ctl.current?.abort();
    },
    [],
  );
  const sizeBytes = (m.downloadGb ?? 0) * 1e9;
  // the readings are BragDoc's own machine: only the runner's when it's on this computer and BragDoc isn't in a container
  const sameMachine = target.class === 'this-computer' && !h.inDocker;
  const lowDisk = sameMachine && h.freeDiskBytes != null && h.freeDiskBytes < sizeBytes * 1.1;
  const lowRam = sameMachine && ramGb(h.ramBytes) < m.ramGb;
  const start = async () => {
    const ac = new AbortController();
    ctl.current = ac;
    pulling.current = true;
    setState({ phase: 'pulling', status: 'asking Ollama…' });
    try {
      const last: AiPullEvent = await pullAiModel(target.id, m.name, (e) => !e.done && setState({ phase: 'pulling', status: e.status, completed: e.completed, total: e.total }), ac.signal);
      if (last.done && last.ok) setState({ phase: 'done' });
      else if (last.done && !last.ok) setState(ac.signal.aborted ? { phase: 'cancelled' } : { phase: 'failed', message: last.error.message });
    } catch (e) {
      if (ac.signal.aborted) setState({ phase: 'cancelled' });
      else setState({ phase: 'failed', message: isApiError(e) ? e.message : (e as Error).message });
    } finally {
      pulling.current = false;
      void qc.invalidateQueries({ queryKey: ['ai-models', target.id] });
    }
  };
  const cancel = () => ctl.current?.abort();
  const pct = state.phase === 'pulling' && state.total ? Math.min(100, Math.round(((state.completed ?? 0) / state.total) * 100)) : null;
  const busy = state.phase === 'pulling';
  return (
    <Dialog
      open
      onClose={busy ? () => {} : onClose}
      size="sm"
      title={`Download ${m.name}?`}
      sub={`Ollama on ${connectionName(target)} would fetch it from Ollama’s own registry. BragDoc only asks; the download happens in Ollama, outside BragDoc.`}
      data-testid="ai-pull-dialog"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {state.phase === 'confirm' && (
            <>
              <Btn kind="ghost" onClick={onClose} data-testid="ai-pull-no">
                Not now
              </Btn>
              <Btn kind={lowDisk || lowRam ? 'danger' : 'accent'} onClick={() => void start()} data-testid="ai-pull-yes">
                <Download className="size-4" aria-hidden /> {lowDisk || lowRam ? 'Download anyway' : `Download about ${m.downloadGb} GB`}
              </Btn>
            </>
          )}
          {busy && (
            <Btn kind="danger" onClick={cancel} data-testid="ai-pull-cancel">
              Cancel
            </Btn>
          )}
          {!busy && state.phase !== 'confirm' && (
            <Btn onClick={onClose} data-testid="ai-pull-close">
              Close
            </Btn>
          )}
        </div>
      }
    >
      <div className="space-y-4 text-[13.5px] leading-relaxed">
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5" data-testid="ai-pull-facts">
          <dt className="text-muted">Download</dt>
          <dd className="m-0 font-semibold" data-testid="ai-pull-size">about {m.downloadGb} GB</dd>
          <dt className="text-muted">{sameMachine ? 'Free space in your home folder' : 'Free space where BragDoc runs'}</dt>
          <dd className={`m-0 font-semibold ${lowDisk ? 'text-bad' : ''}`} data-testid="ai-pull-disk">{h.freeDiskBytes == null ? 'couldn’t tell' : gb(h.freeDiskBytes)}</dd>
          <dt className="text-muted">RAM it wants</dt>
          <dd className={`m-0 font-semibold ${lowRam ? 'text-bad' : ''}`} data-testid="ai-pull-ram">
            {m.ramGb} GB ({sameMachine ? 'this computer' : 'where BragDoc runs'} has {ramGb(h.ramBytes)} GB)
          </dd>
        </dl>
        {!sameMachine && (
          <p className="m-0 text-[12.5px] text-muted" data-testid="ai-pull-elsewhere">
            {h.inDocker ? 'BragDoc is in a container, so these are the container’s readings,' : `This Ollama is on ${target.host}, so these are BragDoc’s readings,`} not those of the machine that would download and run the model. Check that one has the room.
          </p>
        )}
        {lowDisk && (
          <p role="alert" className="m-0 rounded-xl bg-bad/10 p-3 text-[13px] ring-1 ring-bad/30" data-testid="ai-pull-lowdisk">
            Your home folder doesn’t have room for it. If Ollama keeps its models on another disk it may still fit; otherwise free some space first, or Ollama will stop part way.
          </p>
        )}
        {lowRam && (
          <p role="alert" className="m-0 rounded-xl bg-warn/15 p-3 text-[13px] ring-1 ring-warn/40" data-testid="ai-pull-lowram">
            This computer has less RAM than {m.name} wants: it may be very slow, or fail to load.
          </p>
        )}
        <CommandSlab kicker="Or run it yourself" command={`ollama pull ${m.name}`} note="The same download, from a terminal." />
        {state.phase === 'pulling' && (
          <div role="status" aria-live="polite" data-testid="ai-pull-progress">
            <div className="h-2 overflow-hidden rounded-full bg-sunk ring-1 ring-line" role="progressbar" aria-label={`Downloading ${m.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
              <div className="h-full bg-good transition-[width]" style={{ width: `${pct ?? 3}%` }} />
            </div>
            <div className="mt-1 text-[12.5px] text-muted">
              {state.status}
              {pct != null && ` · ${pct}% (${gb(state.completed ?? 0)} of ${gb(state.total)})`}
            </div>
          </div>
        )}
        {state.phase === 'done' && (
          <p role="status" className="m-0 font-semibold text-good" data-testid="ai-pull-done">
            Downloaded. {m.name} is installed on {connectionName(target)}.
          </p>
        )}
        {state.phase === 'cancelled' && (
          <p role="status" className="m-0" data-testid="ai-pull-cancelled">
            Cancelled. Ollama may keep the part it already downloaded, to carry on later.
          </p>
        )}
        {state.phase === 'failed' && (
          <p role="alert" className="m-0 text-bad" data-testid="ai-pull-failed">
            {state.message}
          </p>
        )}
        <p className="m-0 text-[12px] text-faint">Network activity shows two lines: BragDoc asking Ollama (this computer), and the download itself, marked “registry (via Ollama)”.</p>
      </div>
    </Dialog>
  );
}
