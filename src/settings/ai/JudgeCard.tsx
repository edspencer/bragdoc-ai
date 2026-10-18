// Settings → AI → Features: the judge, in Found (SPEC R21, R22, R26; PR25, D75–D77). Its switch, and then, once it's
// on, a second question: "Also judge new candidates as they arrive?", with what that costs here. Turning the judge on
// gives you Judge now and nothing in the background (Ed's default); with a cloud model, background runs need one more
// tick. Then: which kinds it judges (screenshots; merged PRs only if you tick them), its model, when it runs (as they
// arrive, every N hours, only between, only on power) with a plain status, "What counts as a win for me"
// (ai/what-counts.md), exactly what's sent, Judge now, the last run, and how often you agreed with it.
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AiJudgeSettings, AiJudgeStatus, AiStatus } from '../../../shared/api.ts';
import { decisionOnly, JEV_MODEL } from '../../../shared/ai/connections.ts';
import { HOST_CLASS_LABEL } from '../../../shared/ai/hosts.ts';
import { isApiError, putAiFeature, putAiInstructions, resetAiInstructions, runJudge } from '../../api/client.ts';
import { queryKeys, useAiInstructions, useAiModels, useFound, useJudgeStatus } from '../../api/queries.ts';
import { JudgePreviewDialog } from '../../found/JudgePreview.tsx';
import { countsLine, errorWords, POWER_WORDS, scheduleLine, when as at } from '../../found/judge.ts';
import { Btn, Hand, Kicker, Switch, TextArea, inputCls, useToast } from '../../kit/index.ts';
import type { FeatureCardProps } from './index.ts';
import { connectionName, seconds } from './words.ts';

type Patch = Omit<Partial<AiJudgeSettings>, 'when'> & { when?: Partial<AiJudgeSettings['when']> };

const HOURS = [1, 3, 6, 12, 24] as const;
/** What a CPU-only laptop took per screenshot with the recommended small models (FOUND-SPIKE; PR24's runs). */
const TYPICAL_LOCAL_S = 20;

export function JudgeCard({ status, readiness }: FeatureCardProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const f = status.features.judge;
  const judge = useJudgeStatus();
  const j = judge.data;
  const save = useMutation({
    mutationFn: (body: Patch) => putAiFeature('judge', body as Parameters<typeof putAiFeature>[1]),
    // a tick shows its new state at once; the server's answer (or the refetch after an error) settles it
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: queryKeys.ai });
      const before = qc.getQueryData<AiStatus>(queryKeys.ai);
      if (before) {
        const j = before.features.judge;
        qc.setQueryData<AiStatus>(queryKeys.ai, { ...before, features: { ...before.features, judge: { ...j, ...body, when: { ...j.when, ...(body.when ?? {}) } } as AiJudgeSettings } });
      }
      return { before };
    },
    onSuccess: (s) => {
      qc.setQueryData(queryKeys.ai, s);
      void qc.invalidateQueries({ queryKey: queryKeys.judgeStatus });
    },
    onError: (e, _b, ctx) => {
      if (ctx?.before) qc.setQueryData(queryKeys.ai, ctx.before);
      toast({ msg: isApiError(e) ? e.message : 'That didn’t save.', tone: 'bad' });
    },
  });
  const slot = readiness.slot;
  const conn = slot ? status.connections.find((c) => c.id === slot.connection) : undefined;
  const cloud = conn?.class === 'internet';
  // the second question: asked once, right after you switch the judge on (and never while a background trigger is on)
  const [asking, setAsking] = useState(false);
  const turn = (on: boolean) => save.mutate({ enabled: on }, { onSuccess: () => setAsking(on && !f.when.onArrival && !f.when.everyHours) });

  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line lg:col-span-3" data-testid="ai-feature-judge">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-grotesk text-[15px] font-bold">The judge, in Found</div>
          <p className="m-0 mt-1 text-[13px] leading-relaxed text-muted">
            Reads what Found picks up (the screenshots the rules let through; merged PRs if you tick them) and says whether it looks like a win for you, how sure it is, and why. It never keeps or dismisses anything: “Probably not” ones wait in their own group for you.
          </p>
        </div>
        <span className="mt-1 text-[11px] font-bold uppercase text-faint" data-testid="ai-judge-state">
          {f.enabled ? 'on' : 'off'}
        </span>
        <span data-testid="ai-judge-switch">
          <Switch on={f.enabled} onChange={turn} disabled={save.isPending} label="The judge" />
        </span>
      </div>

      {f.enabled && asking && <SecondQuestion cloud={cloud} host={conn?.host ?? null} status={j} onAnswer={(yes) => (yes ? save.mutate({ when: { onArrival: true } }, { onSuccess: () => setAsking(false) }) : setAsking(false))} saving={save.isPending} />}

      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
      <div>
      <div className="mt-3 text-[13px]" data-testid="ai-judge-model">
        <Kicker>Model</Kicker>
        {slot && conn ? (
          <div className="mt-0.5">
            <span className="font-mono font-semibold">{slot.model}</span> on {connectionName(conn)} ({cloud ? conn.host : HOST_CLASS_LABEL[conn.class]})
            {f.model ? ', its own' : ', the shared one'}
          </div>
        ) : (
          <div className="mt-0.5 text-muted">None chosen yet: pick the shared model above, or one for the judge.</div>
        )}
        {f.enabled && !readiness.ready && readiness.message && (
          <p className="m-0 mt-1 text-[12.5px] text-warn" role="status" data-testid="ai-judge-why">
            Not ready: {readiness.message}
          </p>
        )}
        <ModelChoice status={status} own={!!f.model} saving={save.isPending} onSave={(model) => save.mutate({ model })} />
      </div>

      {f.enabled && (
        <>
          <div className="mt-4 space-y-1.5 text-[13px]" data-testid="ai-judge-kinds">
            <Kicker>What it judges</Kicker>
            <Tick on={f.screenshots} onChange={(v) => save.mutate({ screenshots: v })} testId="ai-judge-screenshots" disabled={save.isPending}>
              Screenshots the rules let through
            </Tick>
            <Tick on={f.github} onChange={(v) => save.mutate({ github: v })} testId="ai-judge-github" disabled={save.isPending}>
              Also judge merged PRs <span className="text-muted">(“worth a brag, or routine?”, with an impact)</span>
            </Tick>
          </div>

          <When f={f} cloud={cloud} host={conn?.host ?? null} status={j} saving={save.isPending} onSave={(p) => save.mutate(p)} />
        </>
      )}
      </div>
      {f.enabled && (
        <div>
          <div className="mt-4">
            <Kicker>What counts as a win for me</Kicker>
            <p className="m-0 mb-1.5 mt-0.5 text-[12.5px] text-muted">The judge reads this with every candidate. It’s ai/what-counts.md in your data folder, written for you from your profile when you first switched the judge on: saving it sends nothing anywhere.</p>
            <WhatCountsEditor />
          </div>

          <RunPanel status={j} ready={readiness.ready} />
        </div>
      )}
      </div>
    </div>
  );
}

function Tick({ on, onChange, children, testId, disabled }: { on: boolean; onChange: (v: boolean) => void; children: React.ReactNode; testId: string; disabled?: boolean }) {
  // shows the click at once, until the saved setting (or a refusal, which puts it back) comes from the server
  const [mine, setMine] = useState<boolean | null>(null);
  useEffect(() => setMine(null), [on]);
  return (
    <label className="flex cursor-pointer items-start gap-2 leading-snug">
      <input type="checkbox" checked={mine ?? on} onChange={(e) => (setMine(e.target.checked), onChange(e.target.checked))} disabled={disabled} className="mt-0.5 accent-[var(--accent)]" data-testid={testId} />
      <span>{children}</span>
    </label>
  );
}

/** "Also judge new candidates as they arrive?": the background question, with what it costs here (SPEC R22). */
function SecondQuestion({ cloud, host, status, onAnswer, saving }: { cloud: boolean; host: string | null; status: AiJudgeStatus | undefined; onAnswer: (yes: boolean) => void; saving: boolean }) {
  const last = status?.last;
  const measured = last && last.done > 0 && last.outcome === 'ok' ? (Date.parse(last.endedAt) - Date.parse(last.startedAt)) / last.done : null;
  const cost = cloud
    ? `Each new screenshot’s text would be sent to ${host ?? 'the provider'} as it arrives, without asking each time (and only once you also tick “also in the background” below).`
    : measured
      ? `It took about ${seconds(measured)} of this computer’s CPU per candidate last time.`
      : `With a small model on a laptop’s CPU, that’s about ${TYPICAL_LOCAL_S} s of CPU per screenshot here, in the background.`;
  return (
    <div className="mt-3 rounded-xl bg-sticky p-3 text-[13px] text-ink" role="group" aria-label="Also judge new candidates as they arrive?" data-testid="ai-judge-second-question">
      <div className="font-semibold">The judge is on. For now it judges only when you press Judge now.</div>
      <div className="mt-1">Also judge new candidates as they arrive? {cost}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Btn size="sm" kind="ink" onClick={() => onAnswer(true)} disabled={saving} data-testid="ai-judge-arrival-yes">
          Yes, as they arrive
        </Btn>
        <Btn size="sm" kind="ghost" onClick={() => onAnswer(false)} disabled={saving} data-testid="ai-judge-arrival-no">
          Not now: only Judge now
        </Btn>
      </div>
    </div>
  );
}

/** When it runs by itself: the two triggers, the two conditions, the cloud tick, and what's holding it now. */
function When({ f, cloud, host, status, saving, onSave }: { f: AiJudgeSettings; cloud: boolean; host: string | null; status: AiJudgeStatus | undefined; saving: boolean; onSave: (p: Patch) => void }) {
  const w = f.when;
  const [from, setFrom] = useState(w.onlyBetween?.from ?? '19:00');
  const [to, setTo] = useState(w.onlyBetween?.to ?? '08:00');
  const s = status?.schedule;
  const line = s ? scheduleLine(s, w.onlyBetween) : null;
  return (
    <div className="mt-4 space-y-1.5 text-[13px]" data-testid="ai-judge-when">
      <Kicker>When it runs by itself</Kicker>
      <Tick on={w.onArrival} onChange={(v) => onSave({ when: { onArrival: v } })} testId="ai-judge-on-arrival" disabled={saving}>
        As new candidates arrive <span className="text-muted">(30 s after the last of a burst)</span>
      </Tick>
      <label className="flex items-center gap-2">
        <span>Every</span>
        <select value={w.everyHours ?? ''} onChange={(e) => onSave({ when: { everyHours: e.target.value ? (Number(e.target.value) as AiJudgeSettings['when']['everyHours']) : null } })} disabled={saving} className={`${inputCls} max-w-[9rem] py-1 text-[13px]`} aria-label="Every N hours" data-testid="ai-judge-every">
          <option value="">— (off)</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h === 1 ? '1 hour' : `${h} hours`}
            </option>
          ))}
        </select>
      </label>
      <div className="pt-1 text-[12px] font-semibold text-muted">and only…</div>
      <div className="flex flex-wrap items-center gap-2">
        <Tick on={!!w.onlyBetween} onChange={(v) => onSave({ when: { onlyBetween: v ? { from, to } : null } })} testId="ai-judge-between" disabled={saving}>
          between
        </Tick>
        <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} onBlur={() => w.onlyBetween && from && onSave({ when: { onlyBetween: { from, to } } })} className={`${inputCls} max-w-[8.5rem] py-0.5 text-[13px]`} aria-label="From" data-testid="ai-judge-from" />
        <span>and</span>
        <input type="time" value={to} onChange={(e) => setTo(e.target.value)} onBlur={() => w.onlyBetween && to && onSave({ when: { onlyBetween: { from, to } } })} className={`${inputCls} max-w-[8.5rem] py-0.5 text-[13px]`} aria-label="To" data-testid="ai-judge-to" />
        <span className="text-muted">(local time; across midnight is fine)</span>
      </div>
      <Tick on={w.onlyOnAC} onChange={(v) => onSave({ when: { onlyOnAC: v } })} testId="ai-judge-ac" disabled={saving}>
        when this computer is plugged in {s && <span className="text-muted" data-testid="ai-judge-power">({POWER_WORDS[s.power]})</span>}
      </Tick>
      {cloud && (
        <div className="mt-2 rounded-xl border-2 border-dashed border-warn/60 p-2.5" data-testid="ai-judge-cloud">
          <Tick on={f.backgroundCloud} onChange={(v) => onSave({ backgroundCloud: v })} testId="ai-judge-background-cloud" disabled={saving}>
            Also send to {host ?? 'the cloud provider'} in the background
          </Tick>
          <p className="m-0 mt-1 text-[12px] text-muted">Your judge’s model is on the internet. Without this tick, nothing is sent unless you press Judge now; with it, the runs above send each candidate’s text to {host ?? 'the provider'} without asking each time.</p>
        </div>
      )}
      {line && (
        <p className="m-0 pt-1 text-[12.5px] text-ink" role="status" data-testid="ai-judge-schedule">
          {line}
        </p>
      )}
    </div>
  );
}

/** Judge now, the run in progress or the last one, what's sent, and the agreement count. */
function RunPanel({ status, ready }: { status: AiJudgeStatus | undefined; ready: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [preview, setPreview] = useState(false);
  const found = useFound();
  const sample = (found.data?.items ?? []).find((c) => status && ((c.source === 'screenshots' && status.kinds.screenshots) || (c.source === 'github' && status.kinds.github)));
  const run = useMutation({
    mutationFn: () => runJudge(),
    onSuccess: (r) => {
      if (!r.queued) toast({ msg: 'Nothing is waiting for the judge.' });
      void qc.invalidateQueries({ queryKey: queryKeys.judgeStatus });
    },
    onError: (e) => toast({ msg: `The judge couldn’t start: ${(e as Error).message}`, tone: 'bad' }),
  });
  const last = status?.schedule?.lastRun ?? (status?.last ? { at: status.last.endedAt, trigger: status.last.trigger, outcome: status.last.outcome, error: status.last.error, counts: status.last.counts, total: status.last.total, done: status.last.done } : null);
  const TRIGGER: Record<string, string> = { now: 'Judge now', arrival: 'as they arrived', schedule: 'on schedule', eval: 'an eval', cli: 'the CLI' };
  return (
    <div className="mt-4 space-y-2 text-[13px]" data-testid="ai-judge-run">
      <div className="flex flex-wrap items-center gap-2">
        {status?.running ? (
          <span className="font-semibold text-muted" role="status" data-testid="ai-judge-progress">
            Judging {Math.min(status.running.done + 1, status.running.total)} of {status.running.total}…
          </span>
        ) : (
          <Btn size="sm" kind="paper" onClick={() => run.mutate()} disabled={!ready || run.isPending || !status?.waiting} data-testid="ai-judge-now">
            Judge now{status?.waiting ? ` (${Math.min(status.waiting, status.maxPerRun)})` : ''}
          </Btn>
        )}
        <Btn size="sm" kind="ghost" onClick={() => setPreview(true)} disabled={!sample} title={sample ? undefined : 'Nothing in Found to show it with yet'} data-testid="ai-judge-preview-toggle">
          Show me what’s sent
        </Btn>
        {!sample && <Hand className="text-[15px] text-faint">once something’s in Found</Hand>}
      </div>
      {last && (
        <p className="m-0 text-[12.5px] text-muted" data-testid="ai-judge-last">
          Last run {at(last.at)}, {TRIGGER[last.trigger] ?? last.trigger}: {last.outcome === 'ok' ? countsLine(last.counts) : `${last.done} of ${last.total} done, ${errorWords(last.error)}`}.
        </p>
      )}
      {!!status?.agreement?.of && (
        <p className="m-0 text-[12.5px]" data-testid="ai-judge-agreement">
          You agreed with the judge on <b>{status.agreement.agreed}</b> of {status.agreement.of}.
        </p>
      )}
      {preview && sample && <JudgePreviewDialog id={sample.id} open={preview} onClose={() => setPreview(false)} />}
    </div>
  );
}

/** "What counts as a win for me": ai/what-counts.md, with Save and Reset to the starter (PR22's instructions API). */
function WhatCountsEditor() {
  const q = useAiInstructions('what-counts');
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const file = q.data;
  const onDisk = file?.text ?? '';
  const value = text ?? onDisk;
  const dirty = text !== null && text !== onDisk;
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      setText(null);
      setConflict(false);
      void qc.invalidateQueries({ queryKey: ['ai-instructions'] });
      toast({ msg: done });
    } catch (e) {
      if (isApiError(e, 'conflict')) setConflict(true);
      else toast({ msg: isApiError(e) ? e.message : 'That didn’t save.', tone: 'bad' });
    } finally {
      setBusy(false);
    }
  };
  if (q.isPending) return <div className="text-[12.5px] text-faint">Reading ai/what-counts.md…</div>;
  if (q.isError || !file) return <div className="text-[12.5px] text-bad">Couldn’t read ai/what-counts.md.</div>;
  const over = value.length > file.maxChars;
  return (
    <div className="space-y-2" data-testid="ai-judge-what-counts">
      <TextArea value={value} onChange={(e) => setText(e.target.value)} rows={8} readOnly={file.readOnly} aria-label="What counts as a win for me" className="font-mono text-[12.5px]" data-testid="ai-judge-what-counts-text" />
      {file.problems.length > 0 && (
        <p className="m-0 text-[12px] text-warn" role="status" data-testid="ai-judge-what-counts-problem">
          ai/what-counts.md has a problem: {file.problems[0]!.message}. {file.body ? 'The judge uses the last good copy until it’s fixed.' : 'Until it’s fixed, the judge uses the starter (written from your profile) instead.'}
        </p>
      )}
      {conflict && (
        <p className="m-0 text-[12px]" role="alert">
          <b>It changed meanwhile</b> (by hand, or in another tab).{' '}
          <button type="button" className="font-semibold underline decoration-dotted underline-offset-2" onClick={() => (setText(null), setConflict(false), void q.refetch())}>
            Load that version
          </button>{' '}
          (yours is lost), or copy yours first.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Btn size="sm" kind="ink" onClick={() => void act(() => putAiInstructions('what-counts', value, file.etag ?? null).then((r) => qc.setQueryData(queryKeys.aiInstructions('what-counts'), r)), 'Saved to ai/what-counts.md.')} disabled={!dirty || busy || over || file.readOnly} data-testid="ai-judge-what-counts-save">
          {busy ? 'Saving…' : 'Save'}
        </Btn>
        {dirty && (
          <Btn size="sm" kind="ghost" onClick={() => setText(null)}>
            Undo changes
          </Btn>
        )}
        <Btn size="sm" kind="ghost" onClick={() => void act(() => resetAiInstructions('what-counts'), 'Back to the starter. Your version is in backups/removed/.')} disabled={busy || file.readOnly} data-testid="ai-judge-what-counts-reset">
          Reset to the starter
        </Btn>
        <span className={`ml-auto text-[11.5px] ${over ? 'text-bad' : 'text-faint'}`}>
          ai/what-counts.md · {value.length.toLocaleString('en-US')} / {file.maxChars.toLocaleString('en-US')}
        </span>
      </div>
    </div>
  );
}

/** The judge's own model, or the shared one. A local runner's models are offered to pick from. */
function ModelChoice({ status, own, saving, onSave }: { status: FeatureCardProps['status']; own: boolean; saving: boolean; onSave: (m: { connection: string; model: string } | null) => void }) {
  const [open, setOpen] = useState(false);
  const [connection, setConnection] = useState(status.connections[0]?.id ?? '');
  const [model, setModel] = useState('');
  const c = status.connections.find((x) => x.id === connection);
  const jev = decisionOnly(c?.kind);
  const models = useAiModels(c?.id ?? '-', c?.baseUrl ?? null, open && !!c && !c.blocked && !c.cloud && !jev);
  const known = models.data?.models.map((m) => m.name) ?? [];
  return (
    <>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <Btn size="sm" kind="ghost" onClick={() => setOpen((x) => !x)} aria-expanded={open} data-testid="ai-judge-choose">
          {own ? 'Change the judge’s model' : 'Use a different model for the judge'}
        </Btn>
        {own && (
          <Btn size="sm" kind="ghost" onClick={() => onSave(null)} disabled={saving}>
            Use the shared one
          </Btn>
        )}
      </div>
      {open &&
        (!status.connections.length ? (
          <Hand className="mt-2 block text-[16px] text-faint">add a connection above first</Hand>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="ai-judge-chooser">
            <select value={connection} onChange={(e) => setConnection(e.target.value)} className={`${inputCls} w-auto py-1 text-[13px]`} aria-label="Connection">
              {status.connections.map((x) => (
                <option key={x.id} value={x.id}>
                  {decisionOnly(x.kind) ? 'Jev (cloud)' : connectionName(x)}
                </option>
              ))}
            </select>
            {jev ? (
              // Jev has one model, and answers with a probability only (D82)
              <span className="font-mono text-[13px]">{JEV_MODEL}</span>
            ) : (
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="model, e.g. qwen3.5:4b" aria-label="Model" list="ai-judge-models" className={`${inputCls} w-48 py-1 font-mono text-[13px]`} />
            )}
            <datalist id="ai-judge-models">
              {known.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <Btn size="sm" kind="go" onClick={() => (onSave({ connection, model: jev ? JEV_MODEL : model.trim() }), setOpen(false))} disabled={!connection || (!jev && !model.trim()) || saving}>
              Use for the judge
            </Btn>
            {jev && <span className="basis-full text-[12px] text-muted">Jev answers with a probability only: Found shows how sure it is, with no reason.</span>}
            {!jev && !!model.trim() && models.isSuccess && !known.includes(model.trim()) && <span className="basis-full text-[12px] text-warn">{connectionName(c!)} doesn’t list “{model.trim()}”: check the name, or a run will say the model is missing.</span>}
          </div>
        ))}
    </>
  );
}
