// Settings → Sources → GitHub (SPEC R7, PR13): connect through the gh CLI you're already logged in to (no secret
// stored) or a fine-grained token (kept in secrets.yaml, 0600); choose how far back the first check looks and, if you
// like, which owners or repositories; check now, or every hour if you turn that on (D56); see the last check and any
// error in plain words; disconnect. Nothing leaves this computer until you connect, and every request after that is in
// Network activity. Adapted from the prototype's Sources card (Settings.tsx), without Slack.
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { GithubSourceStatus } from '../../shared/api.ts';
import { githubRepoOf } from '../../shared/links.ts';
import { connectGithub, disconnectGithub, isApiError, putGithub, runGithub } from '../api/client.ts';
import { queryKeys, useGhInstalled, useRepos, useSources } from '../api/queries.ts';
import { Btn, Dot, GithubMark, Kicker, Switch, Tape, TextInput, inputCls, useToast, type Tone } from '../kit/index.ts';
import { githubLine } from '../found/EmptyFound.tsx';

const LOOK_BACK = [30, 90, 180, 365] as const;

/** "acme, my-org/my-app" → ['acme', 'my-org/my-app']. */
const parseScope = (s: string) =>
  s
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);

function errorText(e: unknown): string {
  return isApiError(e) ? e.message : 'BragDoc isn’t answering. Is it still running?';
}

export function GithubCard() {
  const sources = useSources();
  const g = sources.data?.github;
  const [connecting, setConnecting] = useState(false);
  const on = !!g?.enabled;
  const qc = useQueryClient();
  const toast = useToast();
  // once connected, a later disconnect shows the Connect button again, not the old form
  useEffect(() => {
    if (on) setConnecting(false);
  }, [on]);
  const off = useMutation({
    mutationFn: () => disconnectGithub(false),
    onSuccess: () => toast({ msg: 'GitHub is disconnected. What it found stays in Found.' }),
    onError: (e) => toast({ msg: errorText(e), tone: 'bad' }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['sources'] });
      void qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });
  const tone: Tone = !g ? 'off' : !on ? 'off' : g.running ? 'warn' : g.lastRun?.error || g.retryAt ? 'bad' : 'good';
  return (
    <div className="sb-card relative flex flex-col rounded-2xl p-5" style={{ transform: 'rotate(-0.4deg)' }} data-testid="source-github">
      <Tape color="#6b7a8a" className="-top-2.5 right-8 w-14" />
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-sunk text-ink ring-1 ring-line">
          <GithubMark className="size-5" />
        </span>
        <div className="min-w-0 flex-1 font-grotesk text-[17px] font-bold leading-tight">GitHub</div>
        {/* on only when it is connected: switching it on opens the connect form, switching it off disconnects */}
        <Switch
          on={on}
          label="GitHub"
          disabled={!g || off.isPending}
          onChange={(v) => {
            if (on && !v) off.mutate();
            else setConnecting(!connecting); // off: it opens (or closes) the connect form
          }}
        />
      </div>
      <p className="m-0 mt-3 text-[13.5px] leading-relaxed text-muted">
        Pull requests you merged, through the gh CLI if you have it or a token you paste. Each one waits in Found until you keep, merge or dismiss it.
      </p>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-sunk px-3 py-2 text-[12.5px] leading-snug text-muted" data-testid="github-status" role="status">
        <span className="mt-1.5">
          <Dot tone={tone} />
        </span>
        <span>
          {!g
            ? sources.isError
              ? 'Couldn’t read the sources.'
              : '…'
            : !on
              ? 'Off. Nothing is collected, and nothing is sent to GitHub.'
              : `On, through ${g.auth === 'gh' ? 'the gh CLI' : 'a token'}${g.login ? ` as @${g.login}` : ''}: ${githubLine(g)}.`}
        </span>
      </div>
      {g && on && <Connected g={g} />}
      {g && !on && connecting && <Connect onCancel={() => setConnecting(false)} />}
      {g && !on && !connecting && (
        <div className="mt-3">
          <Btn size="sm" kind="accent" onClick={() => setConnecting(true)} data-testid="github-start">
            Connect GitHub
          </Btn>
        </div>
      )}
    </div>
  );
}

function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="mt-3 rounded-xl bg-bad/10 p-3 text-[13px] leading-snug ring-1 ring-bad/30" data-testid="github-error">
      {children}
    </div>
  );
}

/** The connect form: gh or a token, how far back, where. */
function Connect({ onCancel }: { onCancel: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const gh = useGhInstalled(true);
  const repos = useRepos();
  // where to look starts from the GitHub repos you track (D56); empty means everywhere you merged
  const tracked = useMemo(
    () => [...new Set((repos.data?.repos ?? []).filter((r) => r.tracked).map((r) => githubRepoOf(r.remoteUrl)).filter((x): x is string => !!x))],
    [repos.data],
  );
  const [scope, setScope] = useState<string | null>(null);
  const scopeText = scope ?? tracked.join(', ');
  const [days, setDays] = useState<number>(90);
  const [token, setToken] = useState('');
  const [mode, setMode] = useState<'gh' | 'token' | null>(null);
  useEffect(() => {
    if (mode === null && gh.isSuccess) setMode(gh.data ? 'gh' : 'token');
  }, [gh.isSuccess, gh.data, mode]);

  const connect = useMutation({
    mutationFn: () => {
      const opts = { lookBackDays: days, repos: parseScope(scopeText) };
      return mode === 'token' ? connectGithub({ auth: 'token', token, ...opts }) : connectGithub({ auth: 'gh', ...opts });
    },
    onSuccess: (s) => {
      qc.setQueryData(queryKeys.sources, (old: { github: GithubSourceStatus } | undefined) => (old ? { ...old, github: s } : old));
      void qc.invalidateQueries({ queryKey: ['sources'] });
      void qc.invalidateQueries({ queryKey: ['settings'] });
      setToken('');
      toast({ msg: 'GitHub is connected. It’s looking for your merged pull requests now.' });
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    connect.mutate();
  };

  return (
    <form className="mt-4 space-y-4" onSubmit={submit} data-testid="github-connect">
      <fieldset className="m-0 border-0 p-0">
        <legend className="p-0">
          <Kicker>How BragDoc reaches GitHub</Kicker>
        </legend>
        <div className="mt-1.5 grid gap-2">
          <Choice checked={mode === 'gh'} onChange={() => setMode('gh')} value="gh" title="The gh CLI (recommended)" testId="github-mode-gh">
            {gh.isPending ? 'Looking for gh…' : gh.data ? 'Found gh on this computer. BragDoc uses its login and stores no secret.' : 'gh isn’t installed here (or isn’t on BragDoc’s PATH). Install it from cli.github.com and run “gh auth login”, or use a token.'}
          </Choice>
          <Choice checked={mode === 'token'} onChange={() => setMode('token')} value="token" title="A personal access token" testId="github-mode-token">
            A fine-grained token with read-only access to Pull requests. It’s kept in secrets.yaml, readable only by you.
          </Choice>
        </div>
      </fieldset>
      {mode === 'token' && (
        <label className="block">
          <Kicker>Token</Kicker>
          <TextInput
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="github_pat_…"
            className="mt-1.5 font-mono text-[13px]"
            data-testid="github-token"
          />
        </label>
      )}
      <ScopeFields days={days} setDays={setDays} scope={scopeText} setScope={setScope} />
      {connect.isError && <ErrorNote>{errorText(connect.error)}</ErrorNote>}
      <div className="flex flex-wrap gap-2">
        <Btn type="submit" kind="accent" disabled={connect.isPending || !mode || (mode === 'token' && !token.trim())} data-testid="github-connect-go">
          {connect.isPending ? 'Connecting…' : mode === 'token' ? 'Connect with this token' : 'Connect with gh'}
        </Btn>
        <Btn kind="ghost" onClick={onCancel}>
          Not now
        </Btn>
      </div>
      <p className="m-0 text-[12px] leading-snug text-faint">
        Connecting asks GitHub who you are, then searches for pull requests you merged. Every request shows in{' '}
        <Link to="/settings/$tab" params={{ tab: 'network' }} className="underline decoration-dotted underline-offset-2">
          Network activity
        </Link>
        .
      </p>
    </form>
  );
}

function Choice({ checked, onChange, value, title, children, testId }: { checked: boolean; onChange: () => void; value: string; title: string; children: ReactNode; testId: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ring-2 transition ${checked ? 'bg-surface ring-accent' : 'bg-sunk/60 ring-transparent hover:ring-line'}`} data-testid={testId}>
      <input type="radio" name="github-auth" value={value} checked={checked} onChange={onChange} className="mt-1 accent-[var(--accent)]" />
      <span>
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="block text-[12.5px] text-muted">{children}</span>
      </span>
    </label>
  );
}

function ScopeFields({ days, setDays, scope, setScope }: { days: number; setDays: (n: number) => void; scope: string; setScope: (s: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
      <label className="block">
        <Kicker>Look back</Kicker>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${inputCls} mt-1.5 py-2 text-[14px]`} data-testid="github-lookback">
          {[...new Set([...LOOK_BACK, days])].sort((a, b) => a - b).map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-0">
        <Kicker>Where to look</Kicker>
        <TextInput value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Everywhere you merged" className="mt-1.5 py-2 text-[14px]" data-testid="github-scope" />
        <span className="mt-1 block text-[12px] text-faint">Owners or repositories, comma separated (acme, my-org/my-app). Empty: everywhere you merged.</span>
      </label>
    </div>
  );
}

/** Connected: check now, the options, and disconnect. */
function Connected({ g }: { g: GithubSourceStatus }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [days, setDays] = useState(g.lookBackDays);
  const [scope, setScope] = useState(g.repos.join(', '));
  const [forget, setForget] = useState(false);
  // a change made elsewhere (another tab, a hand edit of config.yaml) shows here
  const saved = g.repos.join(', ');
  useEffect(() => setDays(g.lookBackDays), [g.lookBackDays]);
  useEffect(() => setScope(saved), [saved]);
  const put = (s: GithubSourceStatus) => qc.setQueryData(queryKeys.sources, (old: { github: GithubSourceStatus } | undefined) => (old ? { ...old, github: s } : old));

  const run = useMutation({
    mutationFn: runGithub,
    onSuccess: (s) => {
      put(s);
      const r = s.lastRun;
      if (r?.error) toast({ msg: r.error.message, tone: 'bad' });
      else if (r) toast({ msg: r.added ? `Found ${r.added} new pull request${r.added === 1 ? '' : 's'}. They’re waiting in Found.` : 'Nothing new merged since the last check.' });
    },
    onError: (e) => toast({ msg: errorText(e), tone: 'bad' }),
    onSettled: () => void qc.invalidateQueries({ queryKey: ['sources'] }),
  });
  const save = useMutation({
    mutationFn: putGithub,
    onSuccess: (s) => {
      put(s);
      void qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e) => toast({ msg: errorText(e), tone: 'bad' }),
  });
  const disconnect = useMutation({
    mutationFn: () => disconnectGithub(forget),
    onSuccess: (s) => {
      put(s);
      void qc.invalidateQueries({ queryKey: ['settings'] });
      toast({ msg: forget ? 'GitHub is disconnected, and the token is deleted.' : 'GitHub is disconnected. What it found stays in Found.' });
    },
    onError: (e) => toast({ msg: errorText(e), tone: 'bad' }),
  });
  const scopeChanged = parseScope(scope).join(',') !== g.repos.join(',');
  const waiting = !!g.retryAt;

  return (
    <div className="mt-4 space-y-4">
      {g.lastRun?.error && !g.running && <ErrorNote>{g.lastRun.error.message}</ErrorNote>}
      <div className="flex flex-wrap items-center gap-2">
        <Btn size="sm" kind="accent" onClick={() => run.mutate()} disabled={g.running || run.isPending || waiting} data-testid="github-run">
          {g.running || run.isPending ? 'Checking…' : 'Check now'}
        </Btn>
        {g.lastRun && !g.lastRun.error && (
          <span className="text-[12.5px] text-muted" data-testid="github-last">
            Last check: {g.lastRun.seen} merged, {g.lastRun.added} new, {g.lastRun.requests} request{g.lastRun.requests === 1 ? '' : 's'}.
          </span>
        )}
      </div>
      <div className="flex items-start gap-3">
        <Switch on={g.hourly} onChange={(v) => save.mutate({ hourly: v })} label="Check every hour" disabled={save.isPending} />
        <div className="text-[13px] leading-snug">
          <div className="font-semibold">Check every hour</div>
          <div className="text-muted">While BragDoc is running. Off: it only checks when you press Check now.</div>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({ lookBackDays: days, repos: parseScope(scope) });
        }}
        className="space-y-3"
      >
        <ScopeFields days={days} setDays={setDays} scope={scope} setScope={setScope} />
        {(scopeChanged || days !== g.lookBackDays) && (
          <div className="flex flex-wrap items-center gap-2">
            <Btn size="sm" type="submit" disabled={save.isPending} data-testid="github-save">
              Save
            </Btn>
            <span className="text-[12px] text-faint">The next check looks back the whole window again. Nothing you’ve already seen comes back.</span>
          </div>
        )}
      </form>
      <p className="m-0 text-[12px] leading-snug text-faint">
        {g.auth === 'gh'
          ? 'gh makes its own requests to GitHub, outside BragDoc. Each time BragDoc runs it, that’s a line in '
          : 'Requests go to api.github.com through BragDoc, each one a line in '}
        <Link to="/settings/$tab" params={{ tab: 'network' }} className="underline decoration-dotted underline-offset-2">
          Network activity
        </Link>
        .
      </p>
      <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-line pt-3">
        <Btn size="sm" kind="danger" onClick={() => disconnect.mutate()} disabled={disconnect.isPending} data-testid="github-disconnect">
          Disconnect
        </Btn>
        {g.hasToken && (
          <label className="flex items-center gap-2 text-[12.5px] text-muted">
            <input type="checkbox" checked={forget} onChange={(e) => setForget(e.target.checked)} className="accent-[var(--accent)]" />
            Also delete the token from secrets.yaml
          </label>
        )}
      </div>
    </div>
  );
}
