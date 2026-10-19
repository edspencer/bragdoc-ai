// Adding a connection (SPEC R17): the presets as tiles (Ollama, LM Studio, llama.cpp, any OpenAI-compatible server;
// Anthropic, OpenAI, OpenRouter), then a short form. The form says where the address is (this computer, your network,
// internet) as you type it, by host, the way the server and egress will decide: a hosted "OpenAI-compatible" service is
// still the internet. Anything on the internet goes straight on to the consent dialog after it's added; nothing is sent
// before Allow. Adapted from the Scrapbook prototype's provider tiles (layout only).
//
// Jev (D82) is a tile too: it has no address or key of its own, but goes through one of your OpenRouter connections
// (with that one's key), so its form picks which; with none yet, it says to add OpenRouter first. It's cloud, so it
// asks for its own consent next, whatever the OpenRouter connection's.
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { AiConnectionView, AiKindName } from '../../../shared/api.ts';
import { DEFAULT_CONTEXT_TOKENS, KIND_BASE_URL, KIND_LABEL, LOCAL_RUNNER_KINDS } from '../../../shared/ai/connections.ts';
import { HOST_CLASS_LABEL, hostClass } from '../../../shared/ai/hosts.ts';
import { addAiConnection, isApiError } from '../../api/client.ts';
import { queryKeys, useAi } from '../../api/queries.ts';
import { Btn, Dialog, Field, Stamp, TextInput, inputCls } from '../../kit/index.ts';
import { ConsentDialog } from './ConsentDialog.tsx';
import { CLASS_COLOUR, connectionName } from './words.ts';

interface Preset {
  kind: AiKindName;
  line: string;
}

const PRESETS: readonly Preset[] = [
  { kind: 'ollama', line: 'A model runner on this computer (or your network)' },
  { kind: 'lmstudio', line: 'LM Studio’s local server' },
  { kind: 'llamacpp', line: 'llama.cpp’s llama-server' },
  { kind: 'openai-compatible', line: 'Any other server: yours, or a hosted one' },
  { kind: 'anthropic', line: 'Claude, with your key' },
  { kind: 'openai', line: 'GPT, with your key' },
  { kind: 'openrouter', line: 'Many models, with your key' },
  { kind: 'jev', line: 'TypeSafe’s yes-or-no judge for Found, through your OpenRouter key' },
];

/** Does a kind take an address you can change? Cloud providers' are fixed. */
const hasAddress = (k: AiKindName) => LOCAL_RUNNER_KINDS.includes(k) || k === 'openai-compatible';

export function AddConnection() {
  const [kind, setKind] = useState<AiKindName | null>(null);
  const [added, setAdded] = useState<AiConnectionView | null>(null);
  return (
    <div data-testid="ai-add">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PRESETS.map((p) => {
          const url = KIND_BASE_URL[p.kind === 'jev' ? 'openrouter' : p.kind];
          const where = url ? hostClass(url) : null;
          return (
            <button
              key={p.kind}
              type="button"
              onClick={() => setKind(p.kind)}
              data-testid={`ai-add-${p.kind}`}
              className="sb-card flex flex-col items-start gap-1 rounded-2xl p-4 text-left transition hover:-translate-y-0.5"
            >
              <span className="flex w-full items-center gap-2">
                <Plus className="size-4 text-faint" aria-hidden />
                <span className="font-grotesk text-[15px] font-bold">{KIND_LABEL[p.kind]}</span>
                {where && (
                  <span className="ml-auto rounded px-1.5 text-[10.5px] font-bold uppercase" style={{ color: CLASS_COLOUR[where] }}>
                    {where === 'internet' ? 'cloud' : 'local'}
                  </span>
                )}
              </span>
              <span className="text-[12.5px] leading-snug text-muted">{p.line}</span>
            </button>
          );
        })}
      </div>
      {kind && (
        <AddDialog
          kind={kind}
          onClose={(c) => {
            setKind(null);
            // anything on the internet: consent next, before anything at all is sent
            if (c?.cloud) setAdded(c);
          }}
        />
      )}
      {added && <ConsentDialog connection={added} open onClose={() => setAdded(null)} />}
    </div>
  );
}

function AddDialog({ kind, onClose }: { kind: AiKindName; onClose: (added: AiConnectionView | null) => void }) {
  const qc = useQueryClient();
  const preset = KIND_BASE_URL[kind];
  const [name, setName] = useState('');
  const [url, setUrl] = useState(preset ?? '');
  const [context, setContext] = useState(String(DEFAULT_CONTEXT_TOKENS));
  const local = LOCAL_RUNNER_KINDS.includes(kind) || kind === 'openai-compatible';
  // Jev: which OpenRouter connection it goes through (the first, unless you pick another)
  const routers = (useAi().data?.connections ?? []).filter((c) => c.kind === 'openrouter');
  const [via, setVia] = useState('');
  const viaId = via || routers[0]?.id || '';
  const jev = kind === 'jev';
  const typed = url.trim();
  let parsed: URL | null = null;
  try {
    parsed = typed ? new URL(typed) : null;
  } catch {
    parsed = null;
  }
  const viaUrl = routers.find((r) => r.id === viaId)?.baseUrl ?? null;
  const where = hasAddress(kind) ? (parsed ? hostClass(parsed) : null) : jev ? (viaUrl ? hostClass(viaUrl) : null) : preset ? hostClass(preset) : null;
  // the server refuses these too, with the same reason; saying it here saves a round trip
  const plainHttpOut = parsed?.protocol === 'http:' && where === 'internet';
  const add = useMutation({
    mutationFn: () => {
      const n = Number(context);
      return addAiConnection({
        kind,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(hasAddress(kind) && typed && typed !== preset ? { baseUrl: typed } : {}),
        ...(jev ? { via: viaId } : {}),
        ...(local && where !== 'internet' && Number.isInteger(n) && n !== DEFAULT_CONTEXT_TOKENS ? { contextTokens: n } : {}),
      });
    },
    onSuccess: (r) => {
      qc.setQueryData(queryKeys.ai, r.status);
      onClose(r.connection);
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    add.mutate();
  };
  return (
    <Dialog
      open
      onClose={() => onClose(null)}
      title={`Add ${KIND_LABEL[kind]}`}
      sub={
        hasAddress(kind)
          ? 'Where it answers. Nothing is sent until you test it or switch a feature on.'
          : jev
            ? 'Jev only judges what Found picks up. It answers with a probability (“a win: 93%”) and never says why. Requests go to openrouter.ai, on the internet, which passes them to TypeSafe AI. Next you’ll read exactly what would be sent, and decide.'
            : `Requests go to ${preset ? new URL(preset).host : 'the provider'}, on the internet. Next you’ll read exactly what would be sent there, and decide.`
      }
      size="sm"
      data-testid="ai-add-dialog"
      footer={
        <div className="flex justify-end gap-2">
          <Btn kind="ghost" onClick={() => onClose(null)}>
            Cancel
          </Btn>
          <Btn kind="accent" type="submit" form="ai-add-form" disabled={add.isPending || (hasAddress(kind) && (!parsed || plainHttpOut)) || (jev && !viaId)} data-testid="ai-add-save">
            {add.isPending ? 'Adding…' : where === 'internet' ? 'Add, then read what’s sent' : 'Add'}
          </Btn>
        </div>
      }
    >
      <form id="ai-add-form" onSubmit={submit} className="space-y-4">
        {jev &&
          (routers.length ? (
            <Field label="Goes through" hint="The OpenRouter connection whose key Jev uses. Jev still asks for its own consent.">
              <select value={viaId} onChange={(e) => setVia(e.target.value)} className={`${inputCls} w-auto py-1.5 text-[13px]`} data-testid="ai-add-via">
                {routers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {connectionName(r)}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <p className="m-0 rounded-xl bg-warn/10 p-3 text-[13px] leading-snug ring-1 ring-warn/30" data-testid="ai-add-via-none">
              Jev goes through an OpenRouter connection, with its key. Add OpenRouter first (the tile before this one), then come back.
            </p>
          ))}
        {hasAddress(kind) && (
          <Field
            label="Address"
            hint={kind === 'ollama' ? 'Ollama’s usual address is http://127.0.0.1:11434. Change the port if yours runs on another one, or the host for another computer on your network.' : kind === 'openai-compatible' ? 'Its OpenAI-style base URL, usually ending in /v1.' : 'Its usual address.'}
            error={typed && !parsed ? 'That isn’t a web address: it should start with http:// or https://' : plainHttpOut ? 'Only https leaves this computer: http:// is for a runner on this computer or your network.' : undefined}
          >
            <TextInput value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} placeholder="https://llm.example.com/v1" className="font-mono text-[13px]" data-testid="ai-add-url" autoFocus />
          </Field>
        )}
        {where && (
          <div className="flex flex-wrap items-center gap-2 text-[13px]" data-testid="ai-add-where" data-class={where}>
            <span className="text-muted">This address is on</span>
            <Stamp color={CLASS_COLOUR[where]} rotate={-1.5} className="text-[11px]">
              {HOST_CLASS_LABEL[where]}
            </Stamp>
            {where === 'internet' && !jev && <span className="basis-full text-[12.5px] text-muted">So it counts as a cloud provider, whatever kind you picked: you’ll be asked to allow it first.</span>}
          </div>
        )}
        <Field label="Name (optional)" hint="What this page calls it.">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={KIND_LABEL[kind]} data-testid="ai-add-name" />
        </Field>
        {local && where !== 'internet' && (
          <Field label="Context size (tokens)" hint="How much text the model reads at once. 8,192 suits a small model on a laptop.">
            <TextInput type="number" min={512} max={2_000_000} step={512} value={context} onChange={(e) => setContext(e.target.value)} className="w-32" />
          </Field>
        )}
        {add.isError && (
          <p role="alert" className="m-0 rounded-xl bg-bad/10 p-3 text-[13px] ring-1 ring-bad/30" data-testid="ai-add-error">
            {isApiError(add.error) ? add.error.message : 'BragDoc isn’t answering. Is it still running?'}
          </p>
        )}
      </form>
    </Dialog>
  );
}
