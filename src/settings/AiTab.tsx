// Settings → AI (SPEC R17, R18, R26; PR23): the one place you see and control everything AI, where nothing happens
// without you. The master switch; then, once it's on, where models run (connections, consent, keys, Test), looking for
// a runner on this computer, the models (the one features use, and what's recommended for this computer, with a
// confirmed download), the features' cards (src/settings/ai/index.ts FEATURE_CARDS, filled by the feature PRs) and AI
// activity.
//
// With AI off the tab shows the switch, what changes, and any connections you've saved, and nothing that could
// contact a runner: looking for one, listing models and testing all wait until it's on (D69). Turning AI on turns no
// feature on. Adapted from the Scrapbook prototype's AI tab (its tiles and the "what changes" card; layout only, its
// copy and Slack bits dropped).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { AiStatus } from '../../shared/api.ts';
import { HOST_CLASS_LABEL } from '../../shared/ai/hosts.ts';
import { isApiError, putAi } from '../api/client.ts';
import { queryKeys, useAi } from '../api/queries.ts';
import { Hand, Kicker, SectionTitle, Stamp, Switch, useToast } from '../kit/index.ts';
import { LoadError, Loading, Slot } from './common.tsx';
import { AddConnection } from './ai/AddConnection.tsx';
import { ConnectionCard } from './ai/ConnectionCard.tsx';
import { Detect } from './ai/Detect.tsx';
import { FEATURE_CARDS } from './ai/index.ts';
import { Recommended, TextSlot } from './ai/Models.tsx';
import { CLASS_COLOUR, connectionName } from './ai/words.ts';

export function AiTab() {
  const ai = useAi();
  return (
    <div className="space-y-7" data-testid="settings-ai">
      <SectionTitle sub="Optional. BragDoc works fully without any AI: pasting, Found, the board, Projects and Folio all work. AI can judge what Found picks up, tidy what you paste, and draft from a folio, each only once you switch it on.">
        AI
      </SectionTitle>
      {ai.isPending && <Loading what="the AI settings" />}
      {ai.isError && <LoadError error={ai.error} what="the AI settings" retry={() => void ai.refetch()} testId="ai-error" />}
      {ai.data && <Body s={ai.data} />}
    </div>
  );
}

function Body({ s }: { s: AiStatus }) {
  return (
    <>
      <MasterSwitch s={s} />
      {s.secretsProblem && (
        <div role="alert" className="max-w-3xl rounded-2xl bg-bad/10 p-4 text-[13.5px] leading-relaxed ring-1 ring-bad/30" data-testid="ai-secrets-problem">
          <div className="font-bold text-bad">secrets.yaml can’t be read, so keys can’t be used or saved.</div>
          <div className="mt-1 text-muted">{s.secretsProblem} BragDoc won’t overwrite it: fix it by hand (or move it aside), and this goes away.</div>
        </div>
      )}
      {s.enabled ? <On s={s} /> : <Off s={s} />}
    </>
  );
}

function MasterSwitch({ s }: { s: AiStatus }) {
  const qc = useQueryClient();
  const toast = useToast();
  const flip = useMutation({
    mutationFn: (enabled: boolean) => putAi({ enabled }),
    onSuccess: (r) => {
      qc.setQueryData(queryKeys.ai, r);
      if (!r.enabled) toast({ msg: 'AI is off. Anything that was running has stopped, and nothing more is sent to any model.' });
    },
    onError: (e) => toast({ msg: isApiError(e) ? e.message : 'BragDoc isn’t answering. Is it still running?', tone: 'bad' }),
  });
  return (
    <div className="sb-card flex max-w-3xl items-start gap-4 rounded-2xl p-5" data-testid="ai-master">
      <Switch on={s.enabled} onChange={(v) => flip.mutate(v)} label="AI" disabled={flip.isPending} />
      <div className="min-w-0">
        <div className="font-grotesk text-[17px] font-bold" data-testid="ai-master-sentence">
          {s.enabled ? 'AI is on. No feature is on until you switch it on below.' : 'AI is off. Nothing is sent to any model.'}
        </div>
        <div className="mt-1 text-[13px] text-muted">
          {s.enabled
            ? 'Turning it off stops anything running at once, and hides every AI button in the app again.'
            : 'Turning it on lets you set up a model here. It sends nothing by itself, and switches no feature on.'}
        </div>
      </div>
    </div>
  );
}

function Off({ s }: { s: AiStatus }) {
  return (
    <div className="space-y-5">
      <div className="sb-card relative flex max-w-3xl flex-col gap-4 rounded-2xl p-5 sm:flex-row" data-testid="ai-off">
        <Stamp color="var(--muted)" rotate={-4} className="self-start whitespace-nowrap">
          AI is off
        </Stamp>
        <div className="text-[13.5px] leading-relaxed">
          <div>This is the default. While it’s off:</div>
          <ul className="m-0 mt-2 list-disc space-y-1 pl-5">
            <li>Found shows the plain rules each find passed, with no verdict or confidence.</li>
            <li>Folio exports exactly what you picked, with nothing added or rewritten.</li>
            <li>No model is contacted at all, on this computer or anywhere else, and the AI code isn’t even loaded.</li>
          </ul>
          <p className="m-0 mt-3 text-muted">The easiest start is a model runner such as Ollama on this computer, with a small model (about 3–7 GB). Turn AI on to look for one.</p>
        </div>
      </div>
      {s.connections.length > 0 && (
        <div className="max-w-3xl text-[13px]" data-testid="ai-off-saved">
          <Kicker>Saved, and unused while AI is off</Kicker>
          <ul className="m-0 mt-1.5 flex list-none flex-wrap gap-2 p-0">
            {s.connections.map((c) => (
              <li key={c.id} className="rounded-full bg-sunk px-3 py-1 ring-1 ring-line">
                {connectionName(c)} · <span style={{ color: CLASS_COLOUR[c.class] }}>{HOST_CLASS_LABEL[c.class]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function On({ s }: { s: AiStatus }) {
  return (
    <>
      <section className="space-y-4" data-testid="ai-connections">
        <SectionTitle as="h3" sub="A model runner on this computer or your network needs nothing more. Anything on the internet asks for your consent first, and sends nothing until you allow it.">
          Where models run
        </SectionTitle>
        {s.connections.length > 0 && (
          <div className="grid items-start gap-5 lg:grid-cols-2">
            {s.connections.map((c) => (
              <ConnectionCard key={c.id} c={c} status={s} />
            ))}
          </div>
        )}
        <div>
          <Kicker className="mb-2">{s.connections.length ? 'Add another' : 'Add one'}</Kicker>
          <AddConnection />
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle as="h3">Look for a model runner on this computer</SectionTitle>
        <Detect status={s} />
      </section>

      <section className="space-y-4">
        <SectionTitle as="h3">Models</SectionTitle>
        <TextSlot status={s} />
        <div className="space-y-2">
          <Kicker>Recommended for this computer</Kicker>
          <Recommended status={s} />
        </div>
      </section>

      <section className="space-y-3" data-testid="ai-features">
        <SectionTitle as="h3" sub="Each has its own switch, and they're all off until you switch one on.">
          Features
        </SectionTitle>
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {FEATURE_CARDS.map(({ feature, title, what, Card }) =>
            Card ? (
              <Card key={feature} status={s} readiness={s.readiness[feature]} />
            ) : (
              <div key={feature} className="rounded-2xl border-[2.5px] border-dashed border-line p-4" data-testid={`ai-feature-${feature}`}>
                <div className="flex items-baseline gap-2">
                  <div className="font-grotesk text-[15px] font-bold">{title}</div>
                  <span className="ml-auto text-[11px] font-bold uppercase text-faint">off</span>
                </div>
                <p className="m-0 mt-1 text-[13px] leading-relaxed text-muted">{what}</p>
                <Hand className="text-[16px] text-faint">not in this build yet</Hand>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle as="h3">AI activity</SectionTitle>
        <Slot title="Every model call, as a receipt" testId="ai-activity-slot">
          The AI activity log comes with the features. Until then, every call (each test, each look for a runner) is a line in{' '}
          <Link to="/settings/$tab" params={{ tab: 'network' }} className="underline decoration-dotted underline-offset-2">
            Network activity
          </Link>
          , marked this computer, your network or internet.
        </Slot>
      </section>
    </>
  );
}
