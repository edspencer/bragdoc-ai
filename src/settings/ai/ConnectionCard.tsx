// One connection in Settings → AI → Where models run (SPEC R17): its class (this computer, your network, internet: by
// its address, never its kind), its address and context size (local runners), its key (masked, never shown again:
// only `…abcd`, with Forget), consent and Revoke (internet), a model and Test connection with the outcome in plain
// words, Use for AI features, and Remove. Adapted from GithubCard.tsx: its connect / error / rollback flow.
//
// Two tabs can edit different connections at once: connections are a map in config.yaml and every write is a merge
// patch (D53), and the fields here keep what you're typing while the other tab's change refreshes the card.
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Play, Trash2 } from 'lucide-react';
import type { AiConnectionView, AiStatus, AiTestResult } from '../../../shared/api.ts';
import { DEFAULT_CONTEXT_TOKENS, KIND_LABEL, LOCAL_RUNNER_KINDS } from '../../../shared/ai/connections.ts';
import { HOST_CLASS_LABEL } from '../../../shared/ai/hosts.ts';
import { deleteAiConnection, forgetAiKey, isApiError, putAi, putAiConnection, putAiKey, revokeAiConnection, testAiConnection } from '../../api/client.ts';
import { queryKeys, useAiModels } from '../../api/queries.ts';
import { Btn, Dot, Kicker, Stamp, TextInput, inputCls, useToast, type Tone } from '../../kit/index.ts';
import { ConsentDialog } from './ConsentDialog.tsx';
import { CLASS_COLOUR, OUTCOME_HEADLINE, connectionName, seconds } from './words.ts';

/** The longest key the server takes (server/routes/ai.ts KeySchema). */
const KEY_MAX = 500;

const errorText = (e: unknown) => (isApiError(e) ? e.message : 'BragDoc isn’t answering. Is it still running?');

export function ConnectionCard({ c, status }: { c: AiConnectionView; status: AiStatus }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [consenting, setConsenting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const put = (s: AiStatus) => qc.setQueryData(queryKeys.ai, s);
  const editable = LOCAL_RUNNER_KINDS.includes(c.kind) || c.kind === 'openai-compatible';
  const allowed = !c.cloud || !!c.consent?.current;
  const inUse = status.text?.connection === c.id;

  const revoke = useMutation({
    mutationFn: () => revokeAiConnection(c.id),
    onSuccess: (s) => {
      put(s);
      toast({ msg: `${connectionName(c)} is revoked. Nothing more is sent to ${c.host}.` });
    },
    onError: (e) => toast({ msg: errorText(e), tone: 'bad' }),
  });
  const remove = useMutation({
    mutationFn: () => deleteAiConnection(c.id),
    onSuccess: (s) => {
      put(s);
      qc.removeQueries({ queryKey: ['ai-models', c.id] });
      toast({ msg: `${connectionName(c)} is removed${c.hasKey ? ', and its key deleted' : ''}.` });
    },
    onError: (e) => {
      setRemoving(false);
      toast({ msg: errorText(e), tone: 'bad' });
    },
  });

  const tone: Tone = c.blocked ? 'warn' : 'good';
  return (
    <div className="sb-card relative flex flex-col gap-4 rounded-2xl p-5" data-testid={`ai-connection-${c.id}`} data-class={c.class}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="font-grotesk text-[17px] font-bold leading-tight break-words">{connectionName(c)}</div>
          <div className="text-[12px] text-faint">
            {c.name ? `${KIND_LABEL[c.kind]} · ` : ''}
            <span className="font-mono">{c.id}</span>
            {inUse && <span className="ml-1.5 font-semibold text-good">· in use</span>}
          </div>
        </div>
        <Stamp color={CLASS_COLOUR[c.class]} rotate={-2} className="text-[11px]">
          <span data-testid="ai-connection-class">{HOST_CLASS_LABEL[c.class]}</span>
        </Stamp>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-sunk px-3 py-2 text-[12.5px] leading-snug text-muted" role="status" data-testid="ai-connection-status">
        <span className="mt-1.5">
          <Dot tone={tone} />
        </span>
        <span>
          {c.blocked
            ? c.blocked.message
            : c.cloud
              ? `Allowed to send to ${c.host}, on the internet.`
              : `Ready. Requests stay on ${c.class === 'this-computer' ? 'this computer' : 'your network'} (${c.host}).`}
        </span>
      </div>

      {editable ? <AddressField c={c} put={put} /> : c.baseUrl && <Row label="Address"><span className="break-all font-mono text-[12.5px]">{c.baseUrl}</span></Row>}
      {!c.cloud && editable && <ContextField c={c} put={put} />}

      {c.cloud && (
        <div className="space-y-2" data-testid="ai-connection-consent">
          <Kicker>Consent</Kicker>
          {c.consent?.current ? (
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span>
                Allowed {new Date(c.consent.at).toLocaleDateString()} to send to <span className="font-mono">{c.host}</span>.
              </span>
              <Btn size="sm" kind="danger" onClick={() => revoke.mutate()} disabled={revoke.isPending} data-testid="ai-connection-revoke">
                Revoke
              </Btn>
              <Btn size="sm" kind="ghost" onClick={() => setConsenting(true)} data-testid="ai-connection-what">
                What it sends
              </Btn>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-muted">
                {c.consent ? 'What it would send, or where, has changed since you allowed it. Read it again.' : `Not allowed yet: nothing is sent to ${c.host} until you allow it.`}
              </span>
              <Btn size="sm" kind="accent" onClick={() => setConsenting(true)} data-testid="ai-connection-allow">
                Read what’s sent, and allow
              </Btn>
            </div>
          )}
        </div>
      )}

      {(c.needsKey || c.cloud) && c.kind !== 'jev' && <KeyField c={c} secretsProblem={status.secretsProblem} />}

      <TestAndUse c={c} allowed={allowed} inUse={inUse} status={status} put={put} />

      <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-line pt-3">
        {removing ? (
          <>
            <span className="text-[13px]">Remove {connectionName(c)}{c.hasKey ? ' and delete its key' : ''}?</span>
            <Btn size="sm" kind="danger" onClick={() => remove.mutate()} disabled={remove.isPending} data-testid="ai-connection-remove-yes">
              Remove
            </Btn>
            <Btn size="sm" kind="ghost" onClick={() => setRemoving(false)}>
              Keep it
            </Btn>
          </>
        ) : (
          <Btn size="sm" kind="ghost" onClick={() => setRemoving(true)} data-testid="ai-connection-remove">
            <Trash2 className="size-3.5" aria-hidden /> Remove
          </Btn>
        )}
      </div>
      {c.cloud && consenting && <ConsentDialog connection={c} open onClose={() => setConsenting(false)} />}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Kicker>{label}</Kicker>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function AddressField({ c, put }: { c: AiConnectionView; put: (s: AiStatus) => void }) {
  const id = useId();
  const [value, setValue] = useState(c.baseUrl ?? '');
  const [editing, setEditing] = useState(false);
  // a change from another tab shows here, unless you're mid-edit
  useEffect(() => {
    if (!editing) setValue(c.baseUrl ?? '');
  }, [c.baseUrl, editing]);
  const save = useMutation({
    mutationFn: () => putAiConnection(c.id, { baseUrl: value.trim() }),
    onSuccess: (s) => {
      put(s);
      setEditing(false);
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };
  return (
    <form onSubmit={submit}>
      <label htmlFor={id}>
        <Kicker>Address</Kicker>
      </label>
      <div className="mt-1 flex flex-wrap gap-2">
        <TextInput
          id={id}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setEditing(true);
          }}
          spellCheck={false}
          className="min-w-0 flex-1 py-1.5 font-mono text-[12.5px]"
          data-testid="ai-connection-url"
        />
        {editing && value.trim() !== (c.baseUrl ?? '') && (
          <>
            <Btn size="sm" type="submit" disabled={save.isPending || !value.trim()} data-testid="ai-connection-url-save">
              Save
            </Btn>
            <Btn
              size="sm"
              kind="ghost"
              onClick={() => {
                setEditing(false);
                save.reset();
              }}
            >
              Cancel
            </Btn>
          </>
        )}
      </div>
      {editing && (c.hasKey || c.consent) && (
        <p className="m-0 mt-1 text-[12px] text-faint">A new host {c.consent ? 'asks for consent again' : ''}{c.consent && c.hasKey ? ', and ' : ''}{c.hasKey ? 'forgets the saved key' : ''}.</p>
      )}
      {save.isError && (
        <p role="alert" className="m-0 mt-1.5 text-[12.5px] text-bad" data-testid="ai-connection-url-error">
          {errorText(save.error)}
        </p>
      )}
    </form>
  );
}

function ContextField({ c, put }: { c: AiConnectionView; put: (s: AiStatus) => void }) {
  const id = useId();
  const [value, setValue] = useState(String(c.contextTokens));
  useEffect(() => setValue(String(c.contextTokens)), [c.contextTokens]);
  const save = useMutation({ mutationFn: (n: number | null) => putAiConnection(c.id, { contextTokens: n }), onSuccess: put });
  const n = Number(value);
  const valid = Number.isInteger(n) && n >= 512 && n <= 2_000_000;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) save.mutate(n);
      }}
    >
      <label htmlFor={id}>
        <Kicker>Context size (tokens)</Kicker>
      </label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <input id={id} type="number" min={512} max={2_000_000} step={512} value={value} onChange={(e) => setValue(e.target.value)} className={`${inputCls} w-32 py-1.5 text-[13px]`} data-testid="ai-connection-context" />
        {value !== String(c.contextTokens) && (
          <Btn size="sm" type="submit" disabled={!valid || save.isPending}>
            Save
          </Btn>
        )}
        <span className="text-[12px] text-faint">How much text the model is asked to read at once. {DEFAULT_CONTEXT_TOKENS.toLocaleString()} suits a small model on a laptop.</span>
      </div>
      {save.isError && <p role="alert" className="m-0 mt-1.5 text-[12.5px] text-bad">{errorText(save.error)}</p>}
    </form>
  );
}

function KeyField({ c, secretsProblem }: { c: AiConnectionView; secretsProblem: string | null }) {
  const id = useId();
  const qc = useQueryClient();
  const toast = useToast();
  const [key, setKey] = useState('');
  const save = useMutation({
    mutationFn: () => putAiKey(c.id, key),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ai });
      setKey(''); // never kept in the page once it's saved
      toast({ msg: 'Key saved in secrets.yaml. It won’t be shown again.' });
    },
  });
  const forget = useMutation({
    mutationFn: () => forgetAiKey(c.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ai });
      toast({ msg: 'Key deleted from secrets.yaml.' });
    },
    onError: (e) => toast({ msg: errorText(e), tone: 'bad' }),
  });
  return (
    <div data-testid="ai-connection-key">
      <label htmlFor={id}>
        <Kicker className="flex items-center gap-1.5">
          <KeyRound className="size-3.5" aria-hidden /> Key
        </Kicker>
      </label>
      {secretsProblem && (
        <p role="alert" className="m-0 mt-1 text-[12.5px] text-bad">
          {secretsProblem}
        </p>
      )}
      {c.hasKey ? (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
          <span>
            Saved: <span className="font-mono" data-testid="ai-connection-key-hint">{c.keyHint}</span>
          </span>
          <Btn size="sm" kind="ghost" onClick={() => forget.mutate()} disabled={forget.isPending} data-testid="ai-connection-key-forget">
            Forget
          </Btn>
        </div>
      ) : (
        <form
          className="mt-1 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <TextInput
            id={id}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              save.reset();
            }}
            placeholder={c.needsKey ? 'Paste your key' : 'If this server asks for one'}
            className="min-w-0 flex-1 py-1.5 font-mono text-[13px]"
            disabled={!!secretsProblem}
            data-testid="ai-connection-key-input"
          />
          <Btn size="sm" type="submit" disabled={!key.trim() || key.trim().length > KEY_MAX || save.isPending || !!secretsProblem} data-testid="ai-connection-key-save">
            Save key
          </Btn>
        </form>
      )}
      {key.trim().length > KEY_MAX && (
        <p role="alert" className="m-0 mt-1.5 text-[12.5px] text-bad" data-testid="ai-connection-key-long">
          That’s {key.trim().length.toLocaleString()} characters: longer than any key ({KEY_MAX} at most). Did the paste catch something else?
        </p>
      )}
      {save.isError && (
        <p role="alert" className="m-0 mt-1.5 text-[12.5px] text-bad" data-testid="ai-connection-key-error">
          {errorText(save.error)}
        </p>
      )}
      {!c.hasKey && <p className="m-0 mt-1 text-[12px] text-faint">Kept in secrets.yaml on this computer, readable only by you, and sent only to {c.host}.</p>}
    </div>
  );
}

function TestAndUse({ c, allowed, inUse, status, put }: { c: AiConnectionView; allowed: boolean; inUse: boolean; status: AiStatus; put: (s: AiStatus) => void }) {
  const id = useId();
  const listId = useId();
  const toast = useToast();
  const usable = !c.blocked;
  // a local runner is asked what it has when the card opens (a line in Network activity); a cloud one only on a click
  const [listAsked, setListAsked] = useState(!c.cloud);
  // moved onto the internet (or back): asking it again is a click again
  useEffect(() => setListAsked(!c.cloud), [c.cloud]);
  const models = useAiModels(c.id, c.baseUrl, usable && listAsked);
  const slotModel = status.text?.connection === c.id ? status.text.model : '';
  const [model, setModel] = useState(slotModel);
  useEffect(() => {
    if (slotModel) setModel(slotModel);
  }, [slotModel]);
  useEffect(() => {
    if (!model && models.data?.models[0]) setModel(models.data.models[0].name);
  }, [models.data, model]);
  const [result, setResult] = useState<AiTestResult | null>(null);
  const test = useMutation({
    mutationFn: () => testAiConnection(c.id, model.trim() || undefined),
    onMutate: () => setResult(null),
    onSuccess: setResult,
  });
  const use = useMutation({
    mutationFn: () => putAi({ text: { connection: c.id, model: model.trim() } }),
    onSuccess: (s) => {
      put(s);
      toast({ msg: `AI features will use ${model.trim()} on ${connectionName(c)}.` });
    },
    onError: (e) => toast({ msg: errorText(e), tone: 'bad' }),
  });
  const names = models.data?.models.map((m) => m.name) ?? [];
  return (
    <div className="space-y-2" data-testid="ai-connection-test">
      <label htmlFor={id}>
        <Kicker>Model</Kicker>
      </label>
      <div className="flex flex-wrap gap-2">
        <TextInput
          id={id}
          list={listId}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={c.kind === 'ollama' ? 'qwen3.5:4b' : 'a model name'}
          spellCheck={false}
          className="w-full min-w-0 basis-full py-1.5 font-mono text-[12.5px]"
          data-testid="ai-connection-model"
        />
        <datalist id={listId}>
          {names.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <Btn size="sm" onClick={() => test.mutate()} disabled={!usable || !model.trim() || test.isPending} data-testid="ai-connection-test-go">
          <Play className="size-3.5" aria-hidden /> {test.isPending ? 'Testing…' : 'Test connection'}
        </Btn>
        <Btn size="sm" kind={inUse && slotModel === model.trim() ? 'ghost' : 'go'} onClick={() => use.mutate()} disabled={!model.trim() || use.isPending || (inUse && slotModel === model.trim())} data-testid="ai-connection-use">
          {inUse && slotModel === model.trim() ? 'In use' : 'Use for AI features'}
        </Btn>
      </div>
      <div className="text-[12px] text-faint" data-testid="ai-connection-models">
        {!usable
          ? 'Testing and listing models wait until the line above is sorted.'
          : !listAsked
            ? (
              <button type="button" className="underline decoration-dotted underline-offset-2" onClick={() => setListAsked(true)} disabled={!allowed} data-testid="ai-connection-list">
                Ask {c.host} which models it has
              </button>
            )
            : models.isPending
              ? 'Asking it which models it has…'
              : models.isError
                ? `Couldn’t list its models: ${errorText(models.error)} You can still type a name.`
                : names.length
                  ? `${names.length} model${names.length === 1 ? '' : 's'} available${c.cloud ? '' : ' (installed)'}: pick one, or type a name.`
                  : 'It has no models yet. See Recommended for this computer below.'}
      </div>
      {test.isError && (
        <Outcome bad title={isApiError(test.error) && test.error.code in OUTCOME_HEADLINE ? OUTCOME_HEADLINE[test.error.code as keyof typeof OUTCOME_HEADLINE] : 'It didn’t work'}>
          {errorText(test.error)}
        </Outcome>
      )}
      {result?.ok && (
        <Outcome title={`Works: answered in ${seconds(result.ms)}`}>
          Structured answers: {result.structured ? 'yes' : 'no (BragDoc asks for JSON in the instructions instead)'}. Sent to {result.where === 'internet' ? `${c.host}, on the internet` : HOST_CLASS_LABEL[result.where]}, as a line in Network activity.
        </Outcome>
      )}
      {result && !result.ok && (
        <Outcome bad title={OUTCOME_HEADLINE[result.error.code]}>
          {result.error.message}
        </Outcome>
      )}
    </div>
  );
}

function Outcome({ title, children, bad }: { title: string; children: ReactNode; bad?: boolean }) {
  return (
    <div role={bad ? 'alert' : 'status'} data-testid="ai-connection-outcome" data-ok={bad ? 'false' : 'true'} className={`rounded-xl p-3 text-[13px] leading-snug ring-1 ${bad ? 'bg-bad/10 ring-bad/30' : 'bg-good/10 ring-good/30'}`}>
      <div className={`font-semibold ${bad ? 'text-bad' : 'text-good'}`}>{title}</div>
      <div className="mt-0.5 text-muted">{children}</div>
    </div>
  );
}
