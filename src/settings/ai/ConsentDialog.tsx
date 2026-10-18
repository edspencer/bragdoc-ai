// The consent dialog (SPEC R17, principle 5): before a connection to the internet sends anything at all (a test, a
// model list), you read where it goes, what each feature would send there field by field, whose terms apply, and how to
// stop it, then press Allow. It's made from shared/ai/consent.ts, the same statements the docs' provider pages use, and
// what you accept is that statement's version: if a later version would send more, the connection asks again.
// Consent is for a host: whether a connection is cloud is decided by its address, never by its kind, so an
// "OpenAI-compatible" server you typed in on the internet asks too.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import type { AiCallFeature, AiConnectionView } from '../../../shared/api.ts';
import { consentStatement } from '../../../shared/ai/consent.ts';
import { allowAiConnection, isApiError } from '../../api/client.ts';
import { queryKeys } from '../../api/queries.ts';
import { Btn, Dialog, Kicker, useToast } from '../../kit/index.ts';
import { connectionName } from './words.ts';

/** What each feature is called on this page, in the order the statement lists them. */
const FEATURE_WORDS: Partial<Record<AiCallFeature, { title: string; when: string }>> = {
  judge: { title: 'The judge (Found)', when: 'only once you switch the judge on' },
  tidy: { title: 'Tidy this up (the board)', when: 'only when you press Tidy on something' },
  draft: { title: 'Draft with AI (Folio)', when: 'only when you press Draft' },
  test: { title: 'Test connection', when: 'when you press Test' },
};

export function ConsentDialog({ connection: c, open, onClose }: { connection: AiConnectionView; open: boolean; onClose: (allowed: boolean) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const st = consentStatement(c.kind);
  const host = c.host ?? 'its address';
  const allow = useMutation({
    mutationFn: () => allowAiConnection(c.id, c.consentVersion ?? st.version),
    onSuccess: (s) => {
      qc.setQueryData(queryKeys.ai, s);
      toast({ msg: `${connectionName(c)} is allowed. It sends nothing until you test it or switch a feature on.` });
      onClose(true);
    },
    onError: (e) => {
      // the statement moved on while the dialog was open: read the new one
      if (isApiError(e, 'stale_consent')) void qc.invalidateQueries({ queryKey: queryKeys.ai });
    },
  });
  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      title={`Allow BragDoc to send to ${host}?`}
      sub={`${connectionName(c)} is on the internet. Nothing has been sent to it yet, and nothing will be until you allow it here.`}
      tape="#e9961a"
      data-testid="ai-consent"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {allow.isError && (
            <span role="alert" className="mr-auto text-[13px] text-bad" data-testid="ai-consent-error">
              {allow.error instanceof Error ? allow.error.message : 'That didn’t save.'}
            </span>
          )}
          <Btn kind="ghost" onClick={() => onClose(false)} data-testid="ai-consent-no">
            Not now
          </Btn>
          <Btn kind="accent" onClick={() => allow.mutate()} disabled={allow.isPending} data-testid="ai-consent-allow">
            <ShieldCheck className="size-4" aria-hidden /> {allow.isPending ? 'Allowing…' : 'Allow'}
          </Btn>
        </div>
      }
    >
      <div className="space-y-5 text-[13.5px] leading-relaxed">
        <section>
          <Kicker>Where it goes</Kicker>
          <p className="m-0 mt-1">
            Straight from this computer to <span className="font-mono text-[13px] font-semibold" data-testid="ai-consent-host">{host}</span>
            {st.provider ? <>, run by {st.provider}.</> : <>: a server you typed in. BragDoc can’t tell who runs it.</>}
          </p>
        </section>
        <section>
          <Kicker>What each feature would send there</Kicker>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {(Object.keys(st.sends) as AiCallFeature[]).map((f) => {
              const w = FEATURE_WORDS[f];
              return (
                <div key={f} className="rounded-xl bg-sunk/70 p-3 ring-1 ring-line" data-testid={`ai-consent-sends-${f}`}>
                  <div className="font-semibold">{w?.title ?? f}</div>
                  <div className="text-[12px] text-faint">{w?.when}</div>
                  <ul className="m-0 mt-1.5 list-disc space-y-1 pl-4 text-[12.5px]">
                    {st.sends[f]!.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="m-0 mt-2 text-[12.5px] text-muted">Every feature is off until you switch it on. File paths, ids and BragDoc’s own addresses are never sent.</p>
        </section>
        <section>
          <Kicker>Whose terms</Kicker>
          <p className="m-0 mt-1">
            {st.policyUrl ? (
              <>
                {st.provider} receives it under your account and their policy:{' '}
                <a href={st.policyUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-semibold underline decoration-dotted underline-offset-2" data-testid="ai-consent-policy">
                  {st.provider}’s privacy policy <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </>
            ) : (
              <span data-testid="ai-consent-unknown">Unknown provider: check their terms before you allow it.</span>
            )}
          </p>
        </section>
        <section>
          <Kicker>And</Kicker>
          <ul className="m-0 mt-1 list-disc space-y-1 pl-4">
            {st.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      </div>
    </Dialog>
  );
}
