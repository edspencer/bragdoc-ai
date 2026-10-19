// Settings → AI → Features: "Tidy this up" (SPEC R23, R26; PR26). The feature's own switch (off by default; turning
// AI on doesn't turn it on), the model it uses (the shared one, or its own), "How I write" (ai/style.md, shared with
// Draft), and exactly what a tidy sends (GET /api/ai/tidy/preview), with a placeholder where your text goes.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AiTidyPreview } from '../../../shared/api.ts';
import { decisionOnly } from '../../../shared/ai/connections.ts';
import { HOST_CLASS_LABEL } from '../../../shared/ai/hosts.ts';
import { api, isApiError, putAiFeature } from '../../api/client.ts';
import { queryKeys, useAiModels } from '../../api/queries.ts';
import { Btn, Hand, Kicker, Switch, inputCls, useToast } from '../../kit/index.ts';
import type { FeatureCardProps } from './index.ts';
import { StyleEditor } from './StyleEditor.tsx';
import { connectionName } from './words.ts';

export function TidyCard({ status, readiness }: FeatureCardProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const f = status.features.tidy;
  const save = useMutation({
    mutationFn: (body: Parameters<typeof putAiFeature>[1]) => putAiFeature('tidy', body),
    onSuccess: (s) => qc.setQueryData(queryKeys.ai, s),
    onError: (e) => toast({ msg: isApiError(e) ? e.message : 'That didn’t save.', tone: 'bad' }),
  });
  const slot = readiness.slot;
  const conn = slot ? status.connections.find((c) => c.id === slot.connection) : undefined;
  const [choosing, setChoosing] = useState(false);
  const [preview, setPreview] = useState(false);

  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line" data-testid="ai-feature-tidy">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-grotesk text-[15px] font-bold">Tidy this up, on the board</div>
          <p className="m-0 mt-1 text-[13px] leading-relaxed text-muted">
            Turns something you pasted, or a screenshot’s text, into a title, a summary, a date, an impact and projects, for you to use field by field. It’s told to use only what’s in your text: anything that isn’t is underlined, and a date that isn’t is left out. Nothing is saved until you pin it, or Save it in the edit drawer.
          </p>
        </div>
        <span className="mt-1 text-[11px] font-bold uppercase text-faint" data-testid="ai-tidy-state">
          {f.enabled ? 'on' : 'off'}
        </span>
        <span data-testid="ai-tidy-switch">
          <Switch on={f.enabled} onChange={(on) => save.mutate({ enabled: on })} disabled={save.isPending} label="Tidy this up" />
        </span>
      </div>

      <div className="mt-3 text-[13px]" data-testid="ai-tidy-model">
        <Kicker>Model</Kicker>
        {slot && conn ? (
          <div className="mt-0.5">
            <span className="font-mono font-semibold">{slot.model}</span> on {connectionName(conn)} ({conn.class === 'internet' ? conn.host : HOST_CLASS_LABEL[conn.class]})
            {f.model ? ', its own' : ', the shared one'}
          </div>
        ) : (
          <div className="mt-0.5 text-muted">None chosen yet: pick the shared model above, or one for Tidy.</div>
        )}
        {f.enabled && !readiness.ready && readiness.message && (
          <p className="m-0 mt-1 text-[12.5px] text-warn" role="status" data-testid="ai-tidy-why">
            Not ready: {readiness.message}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-2">
          <Btn size="sm" kind="ghost" onClick={() => setChoosing((x) => !x)} aria-expanded={choosing} data-testid="ai-tidy-choose">
            {f.model ? 'Change Tidy’s model' : 'Use a different model for Tidy'}
          </Btn>
          {f.model && (
            <Btn size="sm" kind="ghost" onClick={() => save.mutate({ model: null })} disabled={save.isPending}>
              Use the shared one
            </Btn>
          )}
        </div>
        {choosing && <ModelChooser status={status} saving={save.isPending} onSave={(model) => save.mutate({ model }, { onSuccess: () => setChoosing(false) })} />}
      </div>

      <div className="mt-4">
        <Kicker>How I write</Kicker>
        <p className="m-0 mb-1.5 mt-0.5 text-[12.5px] text-muted">Optional. Tidy (and Draft) follow it. It’s ai/style.md in your data folder: saving it sends nothing anywhere.</p>
        <StyleEditor testId="ai-tidy-style" />
      </div>

      <div className="mt-4">
        <Btn size="sm" kind="ghost" onClick={() => setPreview((x) => !x)} aria-expanded={preview} data-testid="ai-tidy-preview-toggle">
          {preview ? 'Hide what’s sent' : 'See exactly what’s sent'}
        </Btn>
        {preview && <Preview />}
      </div>
    </div>
  );
}

function ModelChooser({ status, saving, onSave }: { status: FeatureCardProps['status']; saving: boolean; onSave: (m: { connection: string; model: string }) => void }) {
  // Jev answers yes-or-no decisions for the judge only: it can't write (D82)
  const conns = status.connections.filter((c) => !decisionOnly(c.kind));
  const [connection, setConnection] = useState(conns[0]?.id ?? '');
  const [model, setModel] = useState('');
  const c = status.connections.find((x) => x.id === connection);
  // what the runner has, to pick from: asked of a usable local one only (a cloud one is asked on its own card, D69)
  const models = useAiModels(c?.id ?? '-', c?.baseUrl ?? null, !!c && !c.blocked && !c.cloud);
  const known = models.data?.models.map((m) => m.name) ?? [];
  const unknown = !!model.trim() && models.isSuccess && !known.includes(model.trim());
  if (!conns.length) return <Hand className="mt-2 block text-[16px] text-faint">add a connection above first</Hand>;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="ai-tidy-chooser">
      <select value={connection} onChange={(e) => setConnection(e.target.value)} className={`${inputCls} w-auto py-1 text-[13px]`} aria-label="Connection">
        {conns.map((c) => (
          <option key={c.id} value={c.id}>
            {connectionName(c)}
          </option>
        ))}
      </select>
      <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="model, e.g. gemma4:e4b" aria-label="Model" list="ai-tidy-models" className={`${inputCls} w-48 py-1 font-mono text-[13px]`} />
      <datalist id="ai-tidy-models">
        {known.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <Btn size="sm" kind="go" onClick={() => onSave({ connection, model: model.trim() })} disabled={!connection || !model.trim() || saving}>
        {saving ? 'Saving…' : 'Use for Tidy'}
      </Btn>
      {unknown && <span className="basis-full text-[12px] text-warn">{connectionName(c!)} doesn’t list “{model.trim()}”: check the name, or a tidy will say the model is missing.</span>}
    </div>
  );
}

// under ai-instructions: a saved "How I write" (here, by hand, in another tab) refreshes it while it's open
function Preview() {
  const q = useQuery({ queryKey: ['ai-instructions', 'tidy-preview'], queryFn: ({ signal }) => api.get<AiTidyPreview>('/api/ai/tidy/preview', { signal }) });
  if (q.isPending) return <div className="mt-2 text-[12.5px] text-faint">Building it…</div>;
  if (q.isError) return <div className="mt-2 text-[12.5px] text-bad">Couldn’t build the preview.</div>;
  return (
    <div className="mt-2 space-y-2" data-testid="ai-tidy-preview">
      <p className="m-0 text-[12px] text-muted">
        What you tidy goes where the placeholder is (up to {q.data.maxChars.toLocaleString('en-US')} characters): your pasted text, the words read from your pictures, or, from the edit drawer, that achievement’s title, summary, notes and quotes (with who said them). Nothing else is sent: no other achievement, no file names, no paths.
      </p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-sunk p-3 font-mono text-[11.5px] leading-relaxed">{`${q.data.system}\n\n────────\n\n${q.data.prompt}`}</pre>
    </div>
  );
}
