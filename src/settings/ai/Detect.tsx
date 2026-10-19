// "Look for a model runner on this computer" (SPEC R18): only when you press it. Each probe is a GET to a runner's
// usual address, logged in Network activity as this computer (`detect`); it also looks for an `ollama` program on
// PATH, which runs nothing. A runner found → Use it. None → BragDoc doesn't install model runners: a link to
// ollama.com, and nothing else. Adapted from ScreenshotsCard.tsx's folder suggestions, as runner suggestions.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Search } from 'lucide-react';
import type { AiDetectedRunner, AiDetectResult, AiStatus } from '../../../shared/api.ts';
import { KIND_LABEL } from '../../../shared/ai/connections.ts';
import { RECOMMENDED_MODELS } from '../../../shared/ai/models.ts';
import { HOST_CLASS_LABEL } from '../../../shared/ai/hosts.ts';
import { addAiConnection, detectAi, isApiError, putAi } from '../../api/client.ts';
import { queryKeys, useAiDetect, useAiHardware } from '../../api/queries.ts';
import { Btn, Kicker, useToast } from '../../kit/index.ts';

const OLLAMA_SITE = 'https://ollama.com';

export function Detect({ status }: { status: AiStatus }) {
  const qc = useQueryClient();
  const last = useAiDetect(true);
  const look = useMutation({
    mutationFn: detectAi,
    onSuccess: (r) => qc.setQueryData(queryKeys.aiDetect, r),
  });
  // the query only (the look writes its answer there): after "Use it" it's refetched, and says the runner is added
  const r = last.data ?? null;
  const hw = useAiHardware(true);
  return (
    <div className="space-y-3" data-testid="ai-detect">
      <div className="flex flex-wrap items-center gap-3">
        <Btn onClick={() => look.mutate()} disabled={look.isPending} data-testid="ai-detect-go">
          <Search className="size-4" aria-hidden /> {look.isPending ? 'Looking…' : r ? 'Look again' : 'Look for a model runner on this computer'}
        </Btn>
        <span className="text-[12.5px] text-muted">
          Asks Ollama, LM Studio and llama.cpp at their usual addresses{hw.data?.inDocker ? ', and Ollama on the computer running Docker' : ''}. Each ask is a line in Network activity.
        </span>
      </div>
      {look.isError && (
        <p role="alert" className="m-0 text-[13px] text-bad">
          {isApiError(look.error) ? look.error.message : 'BragDoc isn’t answering. Is it still running?'}
        </p>
      )}
      {r && <Results r={r} status={status} fresh={look.isSuccess} />}
    </div>
  );
}

function Results({ r, status, fresh }: { r: AiDetectResult; status: AiStatus; fresh: boolean }) {
  const when = new Date(r.at);
  return (
    <div className="space-y-3" data-testid="ai-detect-results">
      {!fresh && <Kicker>Last looked {when.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</Kicker>}
      {r.runners.length === 0 ? (
        <div className="max-w-2xl rounded-2xl bg-sunk/70 p-4 text-[13.5px] leading-relaxed ring-1 ring-line" data-testid="ai-detect-none">
          <div className="font-grotesk text-[15px] font-bold">No model runner answered.</div>
          {r.ollamaOnPath ? (
            <p className="m-0 mt-1" data-testid="ai-detect-installed">
              Ollama is installed here, but isn’t answering at its usual address. Start it (open the app, or run <span className="font-mono text-[12.5px]">ollama serve</span>) and look again. If it
              listens on another port, add it by hand above.
            </p>
          ) : (
            <p className="m-0 mt-1">
              BragDoc doesn’t install model runners. Get Ollama from{' '}
              <a href={OLLAMA_SITE} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-semibold underline decoration-dotted underline-offset-2" data-testid="ai-detect-ollama-link">
                ollama.com <ExternalLink className="size-3.5" aria-hidden />
              </a>
              , then come back.
            </p>
          )}
          <p className="m-0 mt-2 text-[12.5px] text-muted">Running one on another port, or on another computer on your network? Add it by hand above, with its address.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {r.runners.map((x) => (
            <Runner key={`${x.kind}-${x.baseUrl}`} x={x} status={status} />
          ))}
        </div>
      )}
    </div>
  );
}

function Runner({ x, status }: { x: AiDetectedRunner; status: AiStatus }) {
  const qc = useQueryClient();
  const toast = useToast();
  const use = useMutation({
    mutationFn: async () => {
      const r = await addAiConnection({ kind: x.kind, baseUrl: x.baseUrl });
      // the first model, so the features have one: a recommended one if it has it
      const pick = RECOMMENDED_MODELS.find((m) => x.models.some((y) => y.name === m.name))?.name ?? x.models[0]?.name;
      if (!status.text && pick) return { s: await putAi({ text: { connection: r.connection.id, model: pick } }), pick, id: r.connection.id };
      return { s: r.status, pick: null, id: r.connection.id };
    },
    onSuccess: ({ s, pick }) => {
      qc.setQueryData(queryKeys.ai, s);
      void qc.invalidateQueries({ queryKey: queryKeys.aiDetect });
      toast({ msg: pick ? `Added ${KIND_LABEL[x.kind]}. AI features will use ${pick}.` : `Added ${KIND_LABEL[x.kind]}.` });
    },
    onError: (e) => toast({ msg: isApiError(e) ? e.message : 'That didn’t work.', tone: 'bad' }),
  });
  return (
    <div className="sb-card rounded-2xl p-4 text-[13px]" data-testid={`ai-detect-runner-${x.kind}`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-grotesk text-[16px] font-bold">{KIND_LABEL[x.kind]}</span>
        {x.version && <span className="text-faint">{x.version}</span>}
        <span className="ml-auto text-[12px] text-muted">{HOST_CLASS_LABEL[x.where]}</span>
      </div>
      <div className="mt-0.5 break-all font-mono text-[12px] text-muted">{x.baseUrl}</div>
      <div className="mt-2" data-testid="ai-detect-models">
        {x.models.length ? (
          <>
            {x.models.length} model{x.models.length === 1 ? '' : 's'} installed: <span className="font-mono text-[12px]">{x.models.map((m) => m.name).join(', ')}</span>
          </>
        ) : (
          <span className="text-muted">No models installed yet. See Recommended for this computer below for what to get.</span>
        )}
      </div>
      <div className="mt-3">
        {x.connectionId ? (
          <span className="text-[12.5px] font-semibold text-good">Added, as {x.connectionId}.</span>
        ) : (
          <Btn size="sm" kind="go" onClick={() => use.mutate()} disabled={use.isPending} data-testid="ai-detect-use">
            Use it
          </Btn>
        )}
      </div>
    </div>
  );
}
