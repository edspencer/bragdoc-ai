// Settings → AI → Features: "Draft with AI", in Folio (SPEC R24, R26; PR27). The feature's own switch (off by default;
// turning AI on doesn't turn it on), the model it uses (the shared one, or its own) and how much of a folio that model
// can take, "How I write" (ai/style.md, shared with Tidy), and exactly what a draft sends (GET /api/ai/draft/preview),
// with a placeholder where a folio's achievements go.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HOST_CLASS_LABEL } from '../../../shared/ai/hosts.ts';
import { getAiDraftPreview, isApiError, putAiFeature } from '../../api/client.ts';
import { queryKeys } from '../../api/queries.ts';
import { Btn, Hand, Kicker, Switch, inputCls, useToast } from '../../kit/index.ts';
import type { FeatureCardProps } from './index.ts';
import { StyleEditor } from './StyleEditor.tsx';
import { connectionName } from './words.ts';

export function DraftCard({ status, readiness }: FeatureCardProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const f = status.features.draft;
  const save = useMutation({
    mutationFn: (body: Parameters<typeof putAiFeature>[1]) => putAiFeature('draft', body),
    onSuccess: (s) => qc.setQueryData(queryKeys.ai, s),
    onError: (e) => toast({ msg: isApiError(e) ? e.message : 'That didn’t save.', tone: 'bad' }),
  });
  const slot = readiness.slot;
  const conn = slot ? status.connections.find((c) => c.id === slot.connection) : undefined;
  const [choosing, setChoosing] = useState(false);
  const [preview, setPreview] = useState(false);

  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-line" data-testid="ai-feature-draft">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-grotesk text-[15px] font-bold">Draft with AI, in Folio</div>
          <p className="m-0 mt-1 text-[13px] leading-relaxed text-muted">
            Writes a self-review draft from the achievements a folio picks, highest impact first, citing each one. It uses only what’s in them, flags anything it can’t trace back, and saves nothing: the draft is yours to edit and take away.
          </p>
        </div>
        <span className="mt-1 text-[11px] font-bold uppercase text-faint" data-testid="ai-draft-state">
          {f.enabled ? 'on' : 'off'}
        </span>
        <span data-testid="ai-draft-switch">
          <Switch on={f.enabled} onChange={(on) => save.mutate({ enabled: on })} disabled={save.isPending} label="Draft with AI" />
        </span>
      </div>

      <div className="mt-3 text-[13px]" data-testid="ai-draft-model">
        <Kicker>Model</Kicker>
        {slot && conn ? (
          <div className="mt-0.5">
            <span className="font-mono font-semibold">{slot.model}</span> on {connectionName(conn)} ({conn.class === 'internet' ? conn.host : HOST_CLASS_LABEL[conn.class]})
            {f.model ? ', its own' : ', the shared one'}
            <div className="mt-0.5 text-[12px] text-muted" data-testid="ai-draft-context">
              It reads {conn.contextTokens.toLocaleString('en-US')} tokens at a time, the draft included: in a folio too big for that, the lowest-impact achievements are left out, and Folio says how many.
              {conn.class !== 'internet' && ' A local model without a GPU writes a draft in a few minutes.'}
            </div>
          </div>
        ) : (
          <div className="mt-0.5 text-muted">None chosen yet: pick the shared model above, or one for Draft.</div>
        )}
        {f.enabled && !readiness.ready && readiness.message && (
          <p className="m-0 mt-1 text-[12.5px] text-warn" role="status" data-testid="ai-draft-why">
            Not ready: {readiness.message}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-2">
          <Btn size="sm" kind="ghost" onClick={() => setChoosing((x) => !x)} aria-expanded={choosing} data-testid="ai-draft-choose">
            {f.model ? 'Change Draft’s model' : 'Use a different model for Draft'}
          </Btn>
          {f.model && (
            <Btn size="sm" kind="ghost" onClick={() => save.mutate({ model: null })} disabled={save.isPending}>
              Use the shared one
            </Btn>
          )}
        </div>
        {choosing && <ModelChooser status={status} onSave={(model) => (save.mutate({ model }), setChoosing(false))} />}
      </div>

      <div className="mt-4">
        <Kicker>How I write</Kicker>
        <p className="m-0 mb-1.5 mt-0.5 text-[12.5px] text-muted">Optional. Draft (and Tidy) follow it. It’s ai/style.md in your data folder: saving it sends nothing anywhere.</p>
        <StyleEditor testId="ai-draft-style" />
      </div>

      <div className="mt-4">
        <Btn size="sm" kind="ghost" onClick={() => setPreview((x) => !x)} aria-expanded={preview} data-testid="ai-draft-preview-toggle">
          {preview ? 'Hide what’s sent' : 'See exactly what’s sent'}
        </Btn>
        {preview && <Preview />}
      </div>
    </div>
  );
}

function ModelChooser({ status, onSave }: { status: FeatureCardProps['status']; onSave: (m: { connection: string; model: string }) => void }) {
  const [connection, setConnection] = useState(status.connections[0]?.id ?? '');
  const [model, setModel] = useState('');
  if (!status.connections.length) return <Hand className="mt-2 block text-[16px] text-faint">add a connection above first</Hand>;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="ai-draft-chooser">
      <select value={connection} onChange={(e) => setConnection(e.target.value)} className={`${inputCls} w-auto py-1 text-[13px]`} aria-label="Connection">
        {status.connections.map((c) => (
          <option key={c.id} value={c.id}>
            {connectionName(c)}
          </option>
        ))}
      </select>
      <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="model, e.g. gemma4:e4b" aria-label="Model" className={`${inputCls} w-48 py-1 font-mono text-[13px]`} />
      <Btn size="sm" kind="go" onClick={() => onSave({ connection, model: model.trim() })} disabled={!connection || !model.trim()}>
        Use for Draft
      </Btn>
    </div>
  );
}

function Preview() {
  const q = useQuery({ queryKey: ['ai', 'draft-preview'], queryFn: ({ signal }) => getAiDraftPreview(undefined, signal) });
  if (q.isPending) return <div className="mt-2 text-[12.5px] text-faint">Building it…</div>;
  if (q.isError) return <div className="mt-2 text-[12.5px] text-bad">Couldn’t build the preview.</div>;
  return (
    <div className="mt-2 space-y-2" data-testid="ai-draft-preview">
      <p className="m-0 text-[12px] text-muted">
        A folio’s achievements go where the placeholder is, as Folio shows them: titles, summaries, dates, impact, project and company names, and evidence by name. Nothing else is sent: no achievement you unticked or filtered out, no file’s location, no link to this computer.
      </p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-sunk p-3 font-mono text-[11.5px] leading-relaxed">{`${q.data.system}\n\n────────\n\n${q.data.prompt}`}</pre>
    </div>
  );
}
