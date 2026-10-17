// Settings → Sources (SPEC R7, R11, R13): a card per source. The Agents (MCP) card is whole here: where agents
// connect, the bearer token (show, copy, rotate) and where their writes go (mcp.writeTo). GitHub and the screenshots
// folder are cards whose insides their sources fill in (PR13, PR15); every source is off until you turn it on.
// Adapted from the prototype's Sources (Settings.tsx): its card grid, tape and status line, without Slack and the
// "coming soon" connectors.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Eye, EyeOff, ImageIcon, KeyRound } from 'lucide-react';
import type { SettingsResponse } from '../../shared/api.ts';
import { putMcpSettings, rotateMcpToken } from '../api/client.ts';
import { queryKeys, useMcpToken, useMeta, useSettings } from '../api/queries.ts';
import { Btn, Dot, GithubMark, Kicker, SectionTitle, Switch, Tape, useToast, type Tone } from '../kit/index.ts';
import { CommandSlab, CopyButton, LoadError, Loading } from './common.tsx';
import { Notices } from './DataTab.tsx';

export function SourcesTab() {
  const settings = useSettings();
  return (
    <div className="space-y-6" data-testid="settings-sources">
      <SectionTitle sub="GitHub and the screenshots folder collect candidates on their own and drop them into Found, where nothing reaches your board until you keep it. Both are off until you turn them on. Agents can only connect with the token below.">
        Sources
      </SectionTitle>
      <Notices />
      {settings.isError && <LoadError error={settings.error} what="your settings" retry={() => void settings.refetch()} />}
      <div className="grid gap-5 md:grid-cols-2">
        {/* PR13 fills this card: connect with gh or a token, the backfill window, Run now, and its status line */}
        <SourceCard
          testId="source-github"
          icon={<GithubMark className="size-5" />}
          name="GitHub"
          tape="#6b7a8a"
          tilt={-0.4}
          blurb="Pull requests you merged, checked every hour, through the gh CLI if you have it or a token you paste."
          on={settings.data?.sources.github.enabled ?? false}
          status={
            !settings.isSuccess
              ? { tone: 'off', text: settings.isError ? 'Couldn’t read your settings.' : '…' }
              : settings.data.sources.github.enabled
                ? { tone: 'good', text: `On, through ${settings.data.sources.github.auth === 'gh' ? 'the gh CLI' : 'a token'}.` }
                : { tone: 'off', text: 'Off. Nothing is collected.' }
          }
          soon="Connecting GitHub from here comes with the GitHub source."
        />
        {/* PR15 fills this card: pick a folder, the last-7-days look-back, and "40 looked at · 3 sent to Found" */}
        <SourceCard
          testId="source-screenshots"
          icon={<ImageIcon className="size-5" />}
          name="Screenshots folder"
          tape="#3b6cf6"
          tilt={0.35}
          blurb="New screenshots of praise, read on this computer with OCR. Only the ones that pass your rules go to Found."
          on={false}
          status={{ tone: 'off', text: 'Off. Nothing is watched.' }}
          soon="Choosing a folder comes with the screenshots source."
        />
        <AgentsCard settings={settings.data} loading={settings.isPending} />
      </div>
    </div>
  );
}

function SourceCard(p: { testId: string; icon: ReactNode; name: string; tape: string; tilt: number; blurb: string; on: boolean; status: { tone: Tone; text: string }; soon: string }) {
  return (
    <div className="sb-card relative flex flex-col rounded-2xl p-5" style={{ transform: `rotate(${p.tilt}deg)` }} data-testid={p.testId}>
      <Tape color={p.tape} className="-top-2.5 right-8 w-14" />
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-sunk text-ink ring-1 ring-line">{p.icon}</span>
        <div className="min-w-0 flex-1 font-grotesk text-[17px] font-bold leading-tight">{p.name}</div>
        <Switch on={p.on} onChange={() => {}} label={p.name} disabled />
      </div>
      <p className="m-0 mt-3 text-[13.5px] leading-relaxed text-muted">{p.blurb}</p>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-sunk px-3 py-2 text-[12.5px] leading-snug text-muted">
        <span className="mt-1.5">
          <Dot tone={p.status.tone} />
        </span>
        <span>{p.status.text}</span>
      </div>
      <div className="mt-2 text-[12px] text-faint">{p.soon}</div>
    </div>
  );
}

function AgentsCard({ settings, loading }: { settings: SettingsResponse | undefined; loading: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const meta = useMeta();
  // fetched with the page so Copy works in one click (Safari only lets a click copy synchronously-ish); shown masked
  const token = useMcpToken(true);
  const [show, setShow] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const rotateBtn = useRef<HTMLButtonElement>(null);
  const keepBtn = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  // focus goes into the confirmation when it opens, and back to the button that opened it when it closes
  useEffect(() => {
    if (confirming) keepBtn.current?.focus();
    else if (wasConfirming.current) rotateBtn.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  const rotate = useMutation({
    mutationFn: rotateMcpToken,
    onSuccess: (r) => {
      qc.setQueryData(queryKeys.mcpToken, r);
      setConfirming(false);
      toast({ msg: 'New token made. The old one has stopped working: reconnect your agents.' });
    },
    onError: (e) => toast({ msg: e instanceof Error ? e.message : 'Couldn’t make a new token.', tone: 'bad' }),
  });
  // the choice shows at once (a controlled radio would snap back until the mutation's state arrives a tick later), and
  // goes back to what's saved if saving fails
  // goes back to what's saved if saving fails. Arrowing through the options sends each; only the last one's answer
  // (or a fresh read) decides what's shown, so the radios stay enabled and keep keyboard focus.
  const [choice, setChoice] = useState<'board' | 'found' | null>(null);
  const latest = useRef<'board' | 'found' | null>(null);
  const writeTo = useMutation({
    mutationFn: putMcpSettings,
    onError: (e) => toast({ msg: e instanceof Error ? e.message : 'Couldn’t save that.', tone: 'bad' }),
    onSettled: (r, _e, vars) => {
      if (vars.writeTo !== latest.current) return; // a later choice is on its way
      if (r) qc.setQueryData(queryKeys.settings, r);
      else void qc.invalidateQueries({ queryKey: queryKeys.settings });
      latest.current = null;
      setChoice(null);
    },
  });

  const url = token.data?.url ?? meta.data?.mcpUrl;
  const current = choice ?? settings?.mcp.writeTo;
  return (
    <div className="sb-card relative flex flex-col rounded-2xl p-5 md:col-span-2" style={{ transform: 'rotate(-0.15deg)' }} data-testid="source-agents">
      <Tape color="#8b6cf6" className="-top-2.5 right-8 w-14" />
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-sunk text-ink ring-1 ring-line">
          <Bot className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 font-grotesk text-[17px] font-bold leading-tight">Claude Code &amp; other agents</div>
      </div>
      <p className="m-0 mt-3 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        Coding agents that speak MCP can read your projects and recent work, and log what you did. They connect to BragDoc on this computer with a token only they are given.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Kicker>Address</Kicker>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <code className="min-w-0 break-all rounded-lg bg-sunk px-3 py-1.5 font-mono text-[13px]" data-testid="mcp-url">
                {url ?? '…'}
              </code>
              {url && <CopyButton text={url} what="the MCP address" />}
            </div>
          </div>
          <div>
            <Kicker className="flex items-center gap-1.5">
              <KeyRound className="size-3.5" aria-hidden /> Token
            </Kicker>
            {token.isError ? (
              <div className="mt-1.5">
                <LoadError error={token.error} what="the token" retry={() => void token.refetch()} />
              </div>
            ) : (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <code className="min-w-0 break-all rounded-lg bg-sunk px-3 py-1.5 font-mono text-[13px]" data-testid="mcp-token" aria-label={token.data && !show ? 'Token, hidden' : undefined}>
                  {!token.data ? '…' : show ? token.data.token : '•'.repeat(24)}
                </code>
                <Btn size="sm" kind="ghost" onClick={() => setShow(!show)} disabled={!token.data} aria-pressed={show}>
                  {show ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />} {show ? 'Hide' : 'Show'}
                </Btn>
                {token.data && <CopyButton text={token.data.token} what="the MCP token" testId="copy-mcp-token" onFail={() => setShow(true)} />}
              </div>
            )}
            <div className="mt-2 text-[12.5px] leading-snug text-muted">
              It lives in runtime.json in your data folder, readable only by you, and stays the same across restarts.
            </div>
            <div className="mt-3">
              {!confirming ? (
                <Btn ref={rotateBtn} size="sm" kind="danger" onClick={() => setConfirming(true)} data-testid="rotate-token">
                  Make a new token
                </Btn>
              ) : (
                <div className="rounded-xl bg-bad/10 p-3 text-[13px] ring-1 ring-bad/30" role="alertdialog" aria-label="Make a new token?" data-testid="rotate-confirm">
                  <div>Every agent you’ve connected stops working at once, until you reconnect it with the new token.</div>
                  <div className="mt-2 flex gap-2">
                    <Btn size="sm" kind="danger" onClick={() => rotate.mutate()} disabled={rotate.isPending} data-testid="rotate-confirm-yes">
                      {rotate.isPending ? 'Making…' : 'Make a new token'}
                    </Btn>
                    <Btn ref={keepBtn} size="sm" kind="ghost" onClick={() => setConfirming(false)}>
                      Keep this one
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <fieldset className="m-0 border-0 p-0" data-testid="mcp-write-to" disabled={!settings}>
            <legend className="p-0">
              <Kicker>Where their achievements go</Kicker>
            </legend>
            <div className="mt-1.5 grid gap-2">
              {(
                [
                  ['board', 'Straight onto your board', 'Marked “Written by” the agent, so you can always tell.'],
                  ['found', 'Into Found, for you to review', 'Nothing reaches the board until you keep it.'],
                ] as const
              ).map(([v, label, hint]) => (
                <label
                  key={v}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ring-2 transition ${current === v ? 'bg-surface ring-accent' : 'bg-sunk/60 ring-transparent hover:ring-line'}`}
                >
                  <input
                    type="radio"
                    name="mcp-write-to"
                    value={v}
                    checked={current === v}
                    onChange={() => {
                      setChoice(v);
                      latest.current = v;
                      writeTo.mutate({ writeTo: v });
                    }}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <span>
                    <span className="block text-[14px] font-semibold">{label}</span>
                    <span className="block text-[12.5px] text-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {loading && <Loading what="this setting" />}
          </fieldset>
          <CommandSlab kicker="Connect Claude Code" command="bragdoc mcp install claude" note="Adds BragDoc to Claude Code with this address and token. Run it again after making a new token." testId="cmd-mcp-install" />
        </div>
      </div>
    </div>
  );
}
