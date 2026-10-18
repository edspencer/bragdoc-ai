// Welcome (SPEC R10): the first run, and the same steps again later from Settings. Three paper tabs, each skippable:
//   1. About you: profile.yaml (name, role, what people call you) and, if you say, the company you work at.
//   2. Where wins come from: every source off, each with a line on what it does. GitHub connects here (PR13's card);
//      the screenshots folder comes with its source; agents get a note on MCP.
//   3. Your code: a folder you name, scanned a few levels deep for at most 5 s (and, only if you tick them, the places
//      that already know your recent projects). Only the repos you tick are saved.
// Then the board. "Skip for now" leaves at any point, and remembers that you did, so the board doesn't send you back.
// Adapted from the Scrapbook prototype's Welcome.tsx (paper tabs, the cards, the repo checklist).
import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { Bot, Check, FolderGit2, FolderSearch, ImageIcon, X } from 'lucide-react';
import type { DiscoverHintId, DiscoverScanResponse, DiscoveredRepo } from '../../shared/api.ts';
import { addDiscoveredRepos, createCompany, getCompanies, isApiError, putProfile, scanForRepos, skipWelcome } from '../api/client.ts';
import { queryKeys, useDiscoverSuggestions, useProfile, useProjects, useWelcome } from '../api/queries.ts';
import { Btn, Field, Hand, Kicker, Switch, Tape, TextInput, inputCls, useToast } from '../kit/index.ts';
import { GithubCard } from '../settings/GithubCard.tsx';
import { CommandSlab } from '../settings/common.tsx';
import { STEPS, WELCOME_LEFT, type StepId } from '../onboarding/steps.ts';
import { Mark, Wordmark } from '../shell/Logo.tsx';
import { ThemeToggle } from '../shell/ThemeToggle.tsx';


interface WelcomeSearch {
  step?: StepId;
}

export const Route = createFileRoute('/welcome')({
  component: Welcome,
  validateSearch: (s: Record<string, unknown>): WelcomeSearch => (STEPS.some((x) => x.id === s.step) ? { step: s.step as StepId } : {}),
});

/** A repo is ticked to start with if you touched it in the last 30 days (only in the folder you named). */
const RECENT_MS = 30 * 86_400_000;

const HINT_NAME: Record<DiscoverHintId, string> = { vscode: 'VS Code', jetbrains: 'JetBrains', claude: 'Claude Code' };

function Welcome() {
  const { step = 'you' } = Route.useSearch();
  const navigate = useNavigate({ from: '/welcome' });
  const qc = useQueryClient();
  const toast = useToast();
  const welcome = useWelcome();
  const index = STEPS.findIndex((s) => s.id === step);
  const go = (to: StepId) => void navigate({ search: { step: to } });

  // Leaving before the end: remember it, so the board doesn't send you straight back here. Only a first run needs
  // that (with a profile.yaml, the board never sends you here anyway).
  const leave = async () => {
    if (welcome.data && !welcome.data.hasProfile && !welcome.data.skipped) {
      try {
        qc.setQueryData(queryKeys.welcome, await skipWelcome(true));
      } catch (e) {
        // config.yaml is broken (or BragDoc isn't answering): say so, and go anyway; this tab won't bounce you back
        toast({ msg: isApiError(e) ? `BragDoc couldn’t note that you skipped this: ${e.message}` : 'BragDoc couldn’t note that you skipped this.', tone: 'bad' });
      }
    }
    sessionStorage.setItem(WELCOME_LEFT, '1');
    void navigate({ to: '/' });
  };

  const firstRun = !!welcome.data?.firstRun;
  return (
    <main data-testid="welcome-page" className="mx-auto max-w-[780px] px-4 pb-24 pt-6 sm:px-6">
      <div className="flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2 text-ink no-underline" aria-label="BragDoc: skip to your board" onClick={(e) => (e.preventDefault(), void leave())}>
          <Mark />
          <Wordmark />
        </Link>
        <span className="ml-auto">
          <ThemeToggle />
        </span>
      </div>

      {/* paper tabs: any step can be visited, in any order */}
      <nav aria-label="Welcome steps" className="mt-10 flex items-end gap-1.5 pl-3 sm:pl-4">
        {STEPS.map((s, i) => {
          const on = i === index;
          return (
            <Link
              key={s.id}
              to="/welcome"
              search={{ step: s.id }}
              aria-current={on ? 'step' : undefined}
              data-testid={`welcome-tab-${s.id}`}
              className={`flex items-center gap-1.5 rounded-t-xl px-3 pb-2 pt-2 text-[12.5px] font-bold no-underline transition sm:px-4 ${on ? 'bg-surface pt-3 text-ink' : 'bg-sunk text-faint hover:text-muted'}`}
              style={on ? { boxShadow: `inset 0 3px 0 ${s.tape}` } : undefined}
            >
              <span className={`flex size-5 items-center justify-center rounded-full text-[10.5px] ${i < index ? 'bg-good text-white' : on ? 'text-white' : 'ring-1 ring-line'}`} style={on ? { background: s.tape } : undefined}>
                {i < index ? <Check aria-hidden className="size-3" /> : i + 1}
              </span>
              <span className={on ? '' : 'hidden sm:inline'}>{s.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sb-card relative rounded-3xl rounded-tl-md px-5 pb-7 pt-8 sm:px-10">
        <Tape color={STEPS[index]!.tape} className="-top-2.5 right-12 w-20 rotate-3" />
        {step === 'you' && <AboutYou firstRun={firstRun} legacyCli={!!welcome.data?.legacyCli} dataDir={welcome.data?.dataDirDisplay ?? '~/.bragdoc'} onNext={() => go('sources')} onSkip={() => void leave()} />}
        {step === 'sources' && <Sources onBack={() => go('you')} onNext={() => go('code')} onSkip={() => void leave()} />}
        {step === 'code' && <YourCode onBack={() => go('sources')} onDone={() => void leave()} />}
      </div>
      <p className="mt-6 text-center text-[12.5px] text-faint">
        Everything stays in {welcome.data?.dataDirDisplay ?? '~/.bragdoc'} as plain files. You can open the folder in any editor.
      </p>
    </main>
  );
}


function Nav({ onBack, onNext, next = 'Next', onSkip, skip = 'Skip for now', busy, note }: { onBack?: () => void; onNext: () => void; next?: string; onSkip?: () => void; skip?: string; busy?: boolean; note?: ReactNode }) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3 border-t-2 border-dashed border-line pt-5">
      {onBack && (
        <Btn kind="ghost" onClick={onBack} data-testid="welcome-back">
          ← Back
        </Btn>
      )}
      {onSkip && (
        <Btn kind="ghost" onClick={onSkip} data-testid="welcome-skip">
          {skip}
        </Btn>
      )}
      <span className="flex-1" />
      {note && <span className="text-[13px] text-faint">{note}</span>}
      <Btn kind="accent" onClick={onNext} disabled={busy} data-testid="welcome-next">
        {next} →
      </Btn>
    </div>
  );
}

// ---------------------------------------------------------------- 1. About you

/** Chips you type: Enter, comma or Tab adds one, Backspace on an empty box takes the last off. */
function ChipInput({ value, onChange, placeholder, label, testId }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; label: string; testId: string }) {
  const [text, setText] = useState('');
  const add = (t: string) => {
    const v = t.trim().replace(/,$/, '').trim();
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setText('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',' || e.key === 'Tab') && text.trim()) {
      e.preventDefault();
      add(text);
    } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div className={`${inputCls} flex flex-wrap items-center gap-1.5 !py-2`} data-testid={testId}>
      {value.map((a) => (
        <span key={a} className="flex items-center gap-1 rounded-full bg-surface py-0.5 pl-2.5 pr-1 text-[13px] font-semibold ring-1 ring-line">
          {a}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== a))} aria-label={`Remove ${a}`} className="rounded-full p-0.5 text-faint hover:text-ink">
            <X aria-hidden className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setText(e.target.value))}
        onKeyDown={onKey}
        onBlur={() => text.trim() && add(text)}
        placeholder={value.length ? 'add another…' : placeholder}
        aria-label={label}
        className="min-w-28 flex-1 bg-transparent py-0.5 text-[14px] outline-none placeholder:text-faint"
      />
    </div>
  );
}

function AboutYou({ firstRun, legacyCli, dataDir, onNext, onSkip }: { firstRun: boolean; legacyCli: boolean; dataDir: string; onNext: () => void; onSkip: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const profile = useProfile();
  const p = profile.data?.profile;
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [since, setSince] = useState('');
  const [aliases, setAliases] = useState<string[]>([]);
  const [github, setGithub] = useState('');
  const [notMe, setNotMe] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // a profile already there (running the steps again) fills the form in, once
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (filled || !profile.isSuccess) return;
    if (p) {
      setName(p.name);
      setRole(p.role ?? '');
      setAliases(p.aliases ?? []);
      setGithub(p.githubLogin ?? '');
      setNotMe(p.notMe ?? []);
    }
    setFilled(true);
  }, [filled, profile.isSuccess, p]);

  const save = useMutation({
    mutationFn: async () => {
      const r = await putProfile({ name: name.trim(), role: role.trim() || null, aliases, githubLogin: github.trim().replace(/^@/, '') || null, notMe });
      // the company: made once, if there isn't one of that name already
      const c = company.trim();
      if (c) {
        const have = (await getCompanies()).companies.some((x) => x.name.toLowerCase() === c.toLowerCase());
        if (!have) await createCompany({ name: c, ...(role.trim() ? { role: role.trim() } : {}), ...(since ? { start: `${since}-01` } : {}) });
      }
      return r;
    },
    onSuccess: (r) => {
      qc.setQueryData(queryKeys.profile, r);
      void qc.invalidateQueries({ queryKey: queryKeys.welcome });
      void qc.invalidateQueries({ queryKey: queryKeys.companies });
      onNext();
    },
    onError: (e) => toast({ msg: isApiError(e) ? `Couldn’t save that: ${e.message}` : 'Couldn’t save that: BragDoc isn’t answering.', tone: 'bad' }),
  });

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      setError('Say what to call you, or skip this for now.');
      return;
    }
    setError(null);
    save.mutate();
  };

  return (
    <form onSubmit={submit} data-testid="welcome-you" noValidate>
      <Hand rotate={-2} className="text-[24px] leading-none text-accent">
        {firstRun ? 'hello!' : 'about you'}
      </Hand>
      <h1 className="m-0 mt-1 font-grotesk text-[32px] font-extrabold leading-[1.05] tracking-tight sm:text-[42px]">Let’s start with you, not your repos.</h1>
      <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-muted">
        BragDoc is a private scrapbook of the things you’ve done well. It lives in a folder on this computer (<code className="rounded bg-sunk px-1 font-mono text-[13px]">{dataDir}</code>) and doesn’t send anything to anyone unless you connect something.
      </p>
      {legacyCli && (
        <div className="mt-5 rounded-2xl bg-sunk/70 p-4 text-[13.5px] leading-relaxed ring-1 ring-line" data-testid="welcome-import">
          <b>Used BragDoc before?</b> The old CLI’s files were moved, untouched, into <code className="font-mono text-[12.5px]">legacy-cli/</code>. If you have an export from the hosted BragDoc, you can{' '}
          <Link to="/settings/$tab" params={{ tab: 'data' }} className="font-semibold text-accent underline decoration-dotted underline-offset-2">
            import it in Settings → Data
          </Link>
          .
        </div>
      )}
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <Field label="Your name" error={error}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Marlowe" autoComplete="name" data-testid="welcome-name" />
        </Field>
        <Field label="What you do">
          <TextInput value={role} onChange={(e) => setRole(e.target.value)} placeholder="Senior Software Engineer" autoComplete="organization-title" data-testid="welcome-role" />
        </Field>
        <Field label="Where" hint="Optional. Lets you group work by company.">
          <TextInput value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Altimetry" autoComplete="organization" data-testid="welcome-company" />
        </Field>
        <Field label="Since" hint="Optional.">
          <TextInput type="month" value={since} onChange={(e) => setSince(e.target.value)} data-testid="welcome-since" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="What do people call you at work?" hint="Chat names, @handles, nicknames, initials. This is how BragDoc knows a screenshot or a message is about you.">
            <ChipInput value={aliases} onChange={setAliases} placeholder="Alex M, @alex, AM…" label="What people call you at work" testId="welcome-aliases" />
          </Field>
        </div>
        <Field label="Your GitHub username" hint="Optional. For finding your pull requests.">
          <TextInput value={github} onChange={(e) => setGithub(e.target.value)} placeholder="alexmarlowe" autoComplete="username" spellCheck={false} data-testid="welcome-github" />
        </Field>
        <details className="self-end text-[13px] sm:mb-1">
          <summary className="cursor-pointer font-semibold text-muted">Someone at work with a name like yours?</summary>
          <div className="mt-2">
            <ChipInput value={notMe} onChange={setNotMe} placeholder="Alex P, Alexandra…" label="Names that aren’t you" testId="welcome-not-me" />
            <span className="mt-1 block text-[12px] text-faint">BragDoc won’t think a message about them is about you.</span>
          </div>
        </details>
      </div>
      <Nav onNext={() => submit()} onSkip={onSkip} busy={save.isPending} next={save.isPending ? 'Saving' : 'Next'} />
      {/* Enter in a field submits the form; Nav's buttons are plain buttons */}
      <button type="submit" hidden aria-hidden tabIndex={-1} />
    </form>
  );
}

// ---------------------------------------------------------------- 2. Where wins come from

function Sources({ onBack, onNext, onSkip }: { onBack: () => void; onNext: () => void; onSkip: () => void }) {
  return (
    <section data-testid="welcome-sources">
      <h1 className="m-0 font-grotesk text-[32px] font-extrabold leading-[1.05] tracking-tight sm:text-[40px]">Where do your wins turn up?</h1>
      <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-muted">
        Turn any of these on and BragDoc collects candidates into <b className="text-ink">Found</b>. Nothing reaches your board without your say-so. They’re all off until you turn them on, and you can change your mind in Settings.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <GithubCard />
        {/* the screenshots folder comes with its source (PR15): until then, a card saying so, switched off */}
        <div className="sb-card relative flex flex-col rounded-2xl p-5" style={{ transform: 'rotate(0.4deg)' }} data-testid="welcome-screenshots">
          <Tape color="#3b6cf6" className="-top-2.5 right-8 w-14" />
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-sunk text-ink ring-1 ring-line">
              <ImageIcon aria-hidden className="size-5" />
            </span>
            <div className="min-w-0 flex-1 font-grotesk text-[17px] font-bold leading-tight">Screenshots folder</div>
            <Switch on={false} onChange={() => {}} label="Screenshots folder" disabled />
          </div>
          <p className="m-0 mt-3 text-[13.5px] leading-relaxed text-muted">Take a screenshot of praise and it turns up in Found, read with OCR on this computer. Only the ones that mention you go to Found.</p>
          <div className="mt-auto pt-3 text-[12px] text-faint">Coming in the next build: choosing a folder arrives with the screenshots source.</div>
        </div>
        <div className="sb-card relative flex flex-col rounded-2xl p-5 sm:col-span-2" style={{ transform: 'rotate(-0.2deg)' }} data-testid="welcome-agents">
          <Tape color="#8b6cf6" className="-top-2.5 right-8 w-14" />
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-sunk text-ink ring-1 ring-line">
              <Bot aria-hidden className="size-5" />
            </span>
            <div className="min-w-0 flex-1 font-grotesk text-[17px] font-bold leading-tight">Claude Code &amp; other agents</div>
          </div>
          <p className="m-0 mt-3 text-[13.5px] leading-relaxed text-muted">
            Your coding agent can jot down what you did over MCP, connecting to BragDoc on this computer with a token only it is given. There’s nothing to switch on: when you want it, run this in a terminal, or see{' '}
            <Link to="/settings/$tab" params={{ tab: 'sources' }} className="font-semibold text-accent underline decoration-dotted underline-offset-2">
              Settings → Sources
            </Link>
            .
          </p>
          <div className="mt-3">
            <CommandSlab kicker="Connect Claude Code" command="bragdoc mcp install claude" testId="welcome-mcp-command" />
          </div>
        </div>
      </div>
      <Nav onBack={onBack} onNext={onNext} onSkip={onSkip} />
    </section>
  );
}

// ---------------------------------------------------------------- 3. Your code

type ProjectChoice = '' | 'new' | string;

function YourCode({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const suggestions = useDiscoverSuggestions();
  const projects = useProjects();
  const [root, setRoot] = useState<string | null>(null);
  const [hints, setHints] = useState<DiscoverHintId[]>([]);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [project, setProject] = useState<Record<string, ProjectChoice>>({});
  const [added, setAdded] = useState<string[]>([]);
  // the folder box starts with the first usual folder that exists (nothing is read until you press Look)
  const folder = root ?? suggestions.data?.folders[0] ?? '';

  const look = useMutation({
    mutationFn: () => scanForRepos({ root: folder.trim() || null, hints }),
    onSuccess: (r) => {
      const now = Date.now();
      setTicked(Object.fromEntries(r.repos.map((x) => [x.path, !x.known && !x.linked && x.via.includes('folder') && !!x.lastActivity && now - Date.parse(x.lastActivity) < RECENT_MS])));
      setProject({});
      setAdded([]);
    },
  });
  const result = look.data;
  const toAdd = useMemo(() => (result?.repos ?? []).filter((r) => ticked[r.path] && !r.known && !added.includes(r.path)), [result, ticked, added]);

  const add = useMutation({
    mutationFn: () =>
      addDiscoveredRepos({
        repos: toAdd.map((r) => {
          const p = project[r.path] ?? '';
          return { path: r.path, project: p === 'new' ? { name: r.name } : p ? { id: p } : null };
        }),
      }),
    onSuccess: (r) => {
      const ok = r.results.filter((x) => 'repo' in x);
      const bad = r.results.filter((x): x is { path: string; error: string } => 'error' in x);
      setAdded((xs) => [...xs, ...ok.map((x) => x.path)]);
      void qc.invalidateQueries({ queryKey: queryKeys.repos });
      void qc.invalidateQueries({ queryKey: queryKeys.projects });
      if (bad.length) toast({ msg: `${bad.length === 1 ? `${bad[0]!.path} couldn’t be added` : `${bad.length} couldn’t be added`}: ${bad[0]!.error}`, tone: 'bad' });
      else toast({ msg: `Added ${ok.length} repo${ok.length === 1 ? '' : 's'}.` });
    },
    onError: (e) => toast({ msg: isApiError(e) ? e.message : 'Couldn’t add them: BragDoc isn’t answering.', tone: 'bad' }),
  });

  const hintList = suggestions.data?.hints ?? [];
  const canLook = !!folder.trim() || hints.length > 0;

  return (
    <section data-testid="welcome-code">
      <h1 className="m-0 font-grotesk text-[32px] font-extrabold leading-[1.05] tracking-tight sm:text-[40px]">Where do you keep your code?</h1>
      <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-muted">
        BragDoc looks a few folders deep in the folder you name for git repos you’ve worked in lately, for five seconds at most. It doesn’t scan your whole disk, and it only remembers the repos you tick.
      </p>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (canLook) look.mutate();
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-1 basis-60">
            <span className="sr-only">Folder to look in</span>
            <FolderSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input value={folder} onChange={(e) => setRoot(e.target.value)} placeholder="~/Code" spellCheck={false} className={`${inputCls} pl-9 font-mono text-[14px]`} data-testid="discover-root" />
          </label>
          <Btn kind="accent" type="submit" disabled={!canLook || look.isPending} data-testid="discover-look">
            {look.isPending ? 'Looking…' : result ? 'Look again' : 'Look for repos'}
          </Btn>
        </div>
        {!!suggestions.data?.folders.length && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12.5px] text-faint" data-testid="discover-suggestions">
            On this computer:
            {suggestions.data.folders.map((f) => (
              <button key={f} type="button" onClick={() => setRoot(f)} className={`rounded-full px-2.5 py-0.5 font-mono text-[12px] ring-1 ${f === folder ? 'bg-surface text-ink ring-accent' : 'ring-line hover:text-ink'}`}>
                {f}
              </button>
            ))}
          </div>
        )}
        {hintList.length > 0 && (
          <fieldset className="m-0 mt-5 border-0 p-0" data-testid="discover-hints">
            <legend className="p-0">
              <Kicker>Also look at (each one only if you tick it)</Kicker>
            </legend>
            <div className="mt-1.5 grid gap-1.5">
              {hintList.map((h) => (
                <label key={h.id} className={`flex items-start gap-3 rounded-xl px-3 py-2 ${h.available ? 'cursor-pointer hover:bg-sunk/60' : 'opacity-60'}`}>
                  <input
                    type="checkbox"
                    checked={hints.includes(h.id)}
                    disabled={!h.available}
                    onChange={(e) => setHints((xs) => (e.target.checked ? [...xs, h.id] : xs.filter((x) => x !== h.id)))}
                    className="mt-1 size-4 accent-[var(--good)]"
                    data-testid={`discover-hint-${h.id}`}
                  />
                  <span className="text-[13px] leading-snug">
                    <b>{h.label}</b> <span className="text-muted">{h.available ? h.line : 'Not found on this computer.'}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </form>

      {look.isPending && <div className="mt-5 font-hand text-[20px] text-muted">rummaging through {folder.trim() || 'your recent projects'}…</div>}
      {look.isError && (
        <div role="alert" className="mt-5 rounded-xl bg-bad/10 p-3 text-[13.5px] ring-1 ring-bad/30" data-testid="discover-error">
          {isApiError(look.error) ? look.error.message : 'BragDoc isn’t answering. Is it still running?'}
        </div>
      )}
      {result && !look.isPending && <Results result={result} ticked={ticked} setTicked={setTicked} project={project} setProject={setProject} projects={projects.data?.projects ?? []} added={added} />}

      {result && !look.isPending && toAdd.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Btn kind="go" onClick={() => add.mutate()} disabled={add.isPending} data-testid="discover-add">
            <FolderGit2 aria-hidden className="size-4" /> {add.isPending ? 'Adding…' : `Add ${toAdd.length} repo${toAdd.length === 1 ? '' : 's'}`}
          </Btn>
          <span className="text-[12.5px] text-faint">Only these are saved, as repos in your data folder.</span>
        </div>
      )}
      <Nav onBack={onBack} onNext={onDone} next={toAdd.length && !added.length ? 'Open my board without adding' : 'Open my board'} note={!result ? 'You can skip this' : undefined} />
    </section>
  );
}

function Results({
  result,
  ticked,
  setTicked,
  project,
  setProject,
  projects,
  added,
}: {
  result: DiscoverScanResponse;
  ticked: Record<string, boolean>;
  setTicked: (f: (t: Record<string, boolean>) => Record<string, boolean>) => void;
  project: Record<string, ProjectChoice>;
  setProject: (f: (t: Record<string, ProjectChoice>) => Record<string, ProjectChoice>) => void;
  projects: { id: string; name: string; example?: boolean }[];
  added: string[];
}) {
  const n = result.repos.length;
  const took = result.elapsedMs < 1000 ? `${Math.max(1, result.elapsedMs)} ms` : `${(result.elapsedMs / 1000).toFixed(1)} s`;
  return (
    <div className="mt-5 space-y-2" data-testid="discover-results">
      <div className="font-hand text-[20px] leading-tight text-muted" data-testid="discover-summary">
        {n
          ? `found ${n} repo${n === 1 ? '' : 's'} in ${took}, the ones you touched most recently first`
          : result.root
            ? `no git repos in ${result.root}${result.timedOut ? ' so far' : `: ${result.looked.toLocaleString()} folder${result.looked === 1 ? '' : 's'} looked in`}`
            : 'nothing turned up there'}
      </div>
      {result.timedOut && (
        <p className="m-0 rounded-xl bg-warn/12 px-3 py-2 text-[13px] ring-1 ring-warn/40" role="status" data-testid="discover-timed-out">
          BragDoc stopped after 5 seconds ({result.looked.toLocaleString()} folders looked in), so this is what turned up so far. To look deeper, name a folder further in.
        </p>
      )}
      {result.capped && <p className="m-0 text-[13px] text-muted">It stopped at {n} repos. Name a smaller folder to see the rest.</p>}
      {result.unreadable > 0 && (
        <p className="m-0 text-[12.5px] text-faint">
          {result.unreadable} folder{result.unreadable === 1 ? '' : 's'} couldn’t be opened (permissions), so {result.unreadable === 1 ? 'it was' : 'they were'} skipped.
        </p>
      )}
      {result.emptyHints.length > 0 && <p className="m-0 text-[12.5px] text-faint">Nothing recent from {result.emptyHints.map((h) => HINT_NAME[h]).join(' or ')}.</p>}
      {result.repos.map((r) => (
        <RepoRow
          key={r.path}
          r={r}
          on={!!ticked[r.path]}
          done={added.includes(r.path)}
          toggle={() => setTicked((t) => ({ ...t, [r.path]: !t[r.path] }))}
          project={project[r.path] ?? ''}
          setProject={(v) => setProject((p) => ({ ...p, [r.path]: v }))}
          projects={projects.filter((p) => !p.example)}
        />
      ))}
    </div>
  );
}

function RepoRow({ r, on, done, toggle, project, setProject, projects }: { r: DiscoveredRepo; on: boolean; done: boolean; toggle: () => void; project: ProjectChoice; setProject: (v: ProjectChoice) => void; projects: { id: string; name: string }[] }) {
  const mine = r.known || done;
  const others = r.via.filter((v): v is DiscoverHintId => v !== 'folder');
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl p-3 ring-1 ring-line ${on || mine ? 'bg-surface' : 'bg-sunk/50'}`} data-testid="discover-repo">
      <label className="flex min-w-0 flex-1 basis-56 cursor-pointer items-center gap-3">
        <input type="checkbox" checked={mine || on} disabled={mine} onChange={toggle} className="size-4 shrink-0 accent-[var(--good)]" aria-label={`Add ${r.name}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[13.5px] font-semibold">{r.name}</span>
          <span className="block truncate text-[12px] text-faint">
            {r.path}
            {!r.remoteUrl && !r.linked ? ' · no remote' : ''}
          </span>
        </span>
      </label>
      <span className="font-hand text-[17px] leading-tight text-muted sm:text-right" data-testid="discover-why">
        {mine ? (done ? 'added' : 'already one of your repos') : r.why}
        {others.length > 0 && !mine && <span className="ml-1 font-sans text-[11px] text-faint">· {others.map((v) => HINT_NAME[v]).join(', ')}</span>}
      </span>
      {on && !mine && (
        <div className="basis-full pl-7">
          <select value={project} onChange={(e) => setProject(e.target.value)} aria-label={`Project for ${r.name}`} className={`${inputCls} !w-auto max-w-full !py-1 text-[13px]`} data-testid="discover-project">
            <option value="">No project</option>
            <option value="new">New project “{r.name}”</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                Add to “{p.name}”
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
