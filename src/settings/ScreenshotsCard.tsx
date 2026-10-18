// Settings → Sources → Screenshots folder (SPEC R7, PR15): choose a folder (BragDoc suggests where this computer saves
// screenshots), switch watching on or off, look back over the last 7 days once, and see what it has done ("40 looked
// at · 3 sent to Found") and anything wrong in plain words. On a Mac it says plainly what the privacy prompt is about
// and suggests a folder of its own. Adapted from the prototype's Sources card (Settings.tsx) and GithubCard.tsx.
//
// ScreenshotsFolderPicker is the folder choice on its own, for onboarding (PR16): it saves the folder and switches
// watching on, and calls onSaved with the new status.
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, ShieldAlert } from 'lucide-react';
import type { ScreenshotsSourceStatus, SourcesResponse } from '../../shared/api.ts';
import { isApiError, lookBackScreenshots, putScreenshots } from '../api/client.ts';
import { queryKeys, useScreenshotSuggestions, useSources } from '../api/queries.ts';
import { Btn, Dot, Kicker, Switch, Tape, TextInput, useToast, type Tone } from '../kit/index.ts';
import { screenshotCounts, screenshotsLine } from '../found/EmptyFound.tsx';
import { CommandSlab } from './common.tsx';

const MAC_FOLDER_COMMAND = 'mkdir -p ~/Screenshots && defaults write com.apple.screencapture location ~/Screenshots && killall SystemUIServer';

function errorText(e: unknown): string {
  return isApiError(e) ? e.message : 'BragDoc isn’t answering. Is it still running?';
}

/** Put a fresh status into the sources query, so the card changes at once. */
function usePut() {
  const qc = useQueryClient();
  return (s: ScreenshotsSourceStatus) => {
    qc.setQueryData(queryKeys.sources, (old: SourcesResponse | undefined) => (old ? { ...old, screenshots: s } : old));
    void qc.invalidateQueries({ queryKey: ['sources'] });
  };
}

export function ScreenshotsCard() {
  const sources = useSources();
  const s = sources.data?.screenshots;
  const toast = useToast();
  const put = usePut();
  const [choosing, setChoosing] = useState(false);
  const on = !!s?.enabled;

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => putScreenshots({ enabled }),
    onSuccess: (r, enabled) => {
      put(r);
      toast({ msg: enabled ? `Watching ${r.folder} for new screenshots.` : 'The screenshots folder is off. Nothing is watched; what it found stays in Found.' });
    },
    onError: (e) => toast({ msg: errorText(e), tone: 'bad' }),
  });

  const tone: Tone = !s || !on ? 'off' : s.state === 'error' ? 'bad' : s.reading || s.needsProfile ? 'warn' : 'good';
  return (
    <div className="sb-card relative flex flex-col rounded-2xl p-5" style={{ transform: 'rotate(0.35deg)' }} data-testid="source-screenshots">
      <Tape color="#3b6cf6" className="-top-2.5 right-8 w-14" />
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-sunk text-ink ring-1 ring-line">
          <ImageIcon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 font-grotesk text-[17px] font-bold leading-tight">Screenshots folder</div>
        {/* off without a folder: switching it on opens the folder choice */}
        <Switch
          on={on}
          label="Screenshots folder"
          disabled={!s || toggle.isPending}
          onChange={(v) => {
            if (v && !s?.folder) setChoosing(true);
            else toggle.mutate(v);
          }}
        />
      </div>
      <p className="m-0 mt-3 text-[13.5px] leading-relaxed text-muted">
        New screenshots of praise, read on this computer with OCR. Only the ones that pass your rules go to Found; the rest are counted and forgotten.
      </p>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-sunk px-3 py-2 text-[12.5px] leading-snug text-muted" data-testid="screenshots-status" role="status">
        <span className="mt-1.5">
          <Dot tone={tone} />
        </span>
        <span>
          {!s ? (sources.isError ? 'Couldn’t read the sources.' : '…') : !on ? `Off. Nothing is watched.${s.folder ? ` (Folder: ${s.folder}.)` : ''}` : s.state === 'error' ? `${s.error?.message ?? 'It can’t watch the folder.'} BragDoc looks again every half minute.` : `On: ${screenshotsLine(s)}.`}
          {s && (s.counts.looked > 0 || s.counts.ignored > 0) && (
            <span className="mt-0.5 block text-faint" data-testid="screenshots-counts">
              {screenshotCounts(s)}
            </span>
          )}
        </span>
      </div>
      {s && on && s.needsProfile && (
        <Note tone="warn" testId="screenshots-needs-profile">
          BragDoc doesn’t know your name yet, so no screenshot can pass the rules: they look for your name next to praise. Add <code className="font-mono">name:</code> (and any nicknames under{' '}
          <code className="font-mono">aliases:</code>) to profile.yaml in your data folder.
        </Note>
      )}
      {s && s.state === 'error' && s.error?.code === 'denied' && s.platform === 'darwin' && <MacPermission />}
      {s && (choosing || (on && !s.folder)) ? (
        <ScreenshotsFolderPicker
          current={s.folder}
          onSaved={() => setChoosing(false)}
          onCancel={() => {
            setChoosing(false);
            // on without a folder (config.yaml edited by hand): "Not now" means off
            if (on && !s.folder) toggle.mutate(false);
          }}
        />
      ) : (
        s && <Details s={s} on={on} onChange={() => setChoosing(true)} />
      )}
    </div>
  );
}

function Note({ children, tone, testId }: { children: ReactNode; tone: 'warn' | 'bad'; testId?: string }) {
  return (
    <div role={tone === 'bad' ? 'alert' : undefined} className={`mt-3 rounded-xl p-3 text-[13px] leading-snug ring-1 ${tone === 'bad' ? 'bg-bad/10 ring-bad/30' : 'bg-warn/10 ring-warn/30'}`} data-testid={testId}>
      {children}
    </div>
  );
}

/** macOS's privacy prompt (TCC), said plainly, and the tidier way round it. */
function MacPermission({ compact }: { compact?: boolean }) {
  return (
    <div className="mt-3 space-y-3 rounded-xl bg-sunk/70 p-3 text-[12.5px] leading-snug text-muted" data-testid="screenshots-mac-permission">
      <div className="flex gap-2">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
        <div>
          <b className="text-ink">macOS protects Desktop, Documents and Downloads.</b> The first time BragDoc reads one, macOS asks whether the app it runs in may. That’s Terminal (or your terminal app) when you start BragDoc yourself, or{' '}
          <code className="font-mono">node</code> for the background service, and saying yes lets every program run that way read the folder too. If you said no, change it in System Settings → Privacy &amp; Security → Files and Folders.
        </div>
      </div>
      {!compact && (
        <CommandSlab
          kicker="Tidier: screenshots in a folder of their own"
          command={MAC_FOLDER_COMMAND}
          note="New screenshots go to ~/Screenshots from then on (no permission prompt). Then choose that folder here."
          testId="cmd-screenshots-folder"
        />
      )}
    </div>
  );
}

/** Watching: the folder, the name filter, the look back, and the last file it saw. */
function Details({ s, on, onChange }: { s: ScreenshotsSourceStatus; on: boolean; onChange: () => void }) {
  const toast = useToast();
  const put = usePut();
  const filter = useMutation({
    mutationFn: (v: boolean) => putScreenshots({ onlyScreenshots: v }),
    onSuccess: put,
    onError: (e) => toast({ msg: errorText(e), tone: 'bad' }),
  });
  const look = useMutation({
    mutationFn: () => lookBackScreenshots({ days: 7 }),
    onSuccess: (r) => {
      put(r);
      toast({ msg: r.lookBack?.total ? `Reading ${r.lookBack.total} file${r.lookBack.total === 1 ? '' : 's'} from the last 7 days. Anything that passes goes to Found.` : 'Nothing in the folder from the last 7 days.' });
    },
    onError: (e) => toast({ msg: errorText(e), tone: 'bad' }),
  });
  const lb = s.lookBack;
  return (
    <div className="mt-4 space-y-4">
      {!s.folder ? (
        <Btn size="sm" kind="accent" onClick={onChange} data-testid="screenshots-start">
          Choose a folder
        </Btn>
      ) : (
      <div className="flex flex-wrap items-center gap-2">
        <Kicker>Folder</Kicker>
        <code className="min-w-0 break-all rounded-lg bg-sunk px-2.5 py-1 font-mono text-[12.5px]" data-testid="screenshots-folder">
          {s.folder ?? 'none chosen'}
        </code>
        <Btn size="sm" kind="ghost" onClick={onChange} data-testid="screenshots-change">
          Change
        </Btn>
      </div>
      )}
      {on && (
        <>
          <div className="flex items-start gap-3">
            <Switch on={s.onlyScreenshots} onChange={(v) => filter.mutate(v)} label="Only files named like screenshots" disabled={filter.isPending} />
            <div className="text-[13px] leading-snug">
              <div className="font-semibold">Only files named like screenshots</div>
              <div className="text-muted">“Screenshot 2026-10-17 at 9.41.03 PM.png”, in any language. Off: every picture that lands in the folder is read.</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn size="sm" onClick={() => look.mutate()} disabled={look.isPending || !!lb?.running || s.state === 'error'} data-testid="screenshots-look-back">
              {lb?.running ? `Looking back… ${lb.done} of ${lb.total}` : 'Look at the last 7 days'}
            </Btn>
            <span className="text-[12px] text-faint">Only new screenshots are read by themselves. This reads what’s already there, once.</span>
          </div>
          {s.lastSeen && (
            <div className="text-[12px] leading-snug text-muted" data-testid="screenshots-last-seen">
              Last: <span className="break-all">{s.lastSeen.name}</span>: {s.lastSeen.outcome}.
            </div>
          )}
        </>
      )}
      {s.platform === 'darwin' && s.state !== 'error' && (
        <details className="text-[12.5px] text-muted">
          <summary className="cursor-pointer font-semibold">About macOS’s permission prompt</summary>
          <MacPermission />
        </details>
      )}
      <p className="m-0 text-[12px] leading-snug text-faint">Read on this computer: nothing is sent anywhere, and a screenshot that doesn’t pass leaves no text behind. One you keep is copied into your evidence folder.</p>
    </div>
  );
}

/**
 * Choose the folder to watch: the suggestions (where this computer saves screenshots), or any other. Saving checks the
 * folder, then switches watching on. For onboarding (PR16) too.
 */
export function ScreenshotsFolderPicker({ current, onSaved, onCancel, saveLabel = 'Watch this folder' }: { current?: string | null; onSaved?: (s: ScreenshotsSourceStatus) => void; onCancel?: () => void; saveLabel?: string }) {
  const toast = useToast();
  const put = usePut();
  const sug = useScreenshotSuggestions();
  const [pick, setPick] = useState<string | null>(current ?? null);
  const [other, setOther] = useState('');
  const list = sug.data?.suggestions ?? [];
  // the first suggestion that exists, once they've loaded
  useEffect(() => {
    if (pick === null && list.length) setPick(list.find((x) => x.exists)?.folder ?? '');
  }, [list, pick]);
  // '' is "Another folder"
  const isOther = pick === '';
  const folder = isOther ? other.trim() : pick;
  const chosen = list.find((x) => x.folder === folder);
  const save = useMutation({
    mutationFn: () => putScreenshots({ folder: folder ?? '', enabled: true }),
    onSuccess: (r) => {
      put(r);
      toast({ msg: `Watching ${r.folder} for new screenshots.` });
      onSaved?.(r);
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (folder) save.mutate();
  };
  return (
    <form className="mt-4 space-y-3" onSubmit={submit} data-testid="screenshots-picker">
      <fieldset className="m-0 border-0 p-0">
        <legend className="p-0">
          <Kicker>Which folder?</Kicker>
        </legend>
        <div className="mt-1.5 grid gap-2">
          {sug.isPending && <div className="text-[12.5px] text-muted">Looking for where screenshots go…</div>}
          {sug.isError && <div className="text-[12.5px] text-muted">BragDoc couldn’t suggest a folder ({errorText(sug.error)}). Type one below.</div>}
          {current && !list.some((x) => x.folder === current) && (
            <Choice checked={pick === current} onChange={() => setPick(current)} title={current} testId="screenshots-pick-current">
              The folder you chose before.
            </Choice>
          )}
          {list.map((x) => (
            <Choice key={x.folder} checked={pick === x.folder} onChange={() => setPick(x.folder)} title={x.folder} testId="screenshots-pick">
              {x.why}
              {!x.exists && ' · not there yet: make it first'}
              {x.protected && ' · macOS asks for permission'}
            </Choice>
          ))}
          <Choice checked={isOther} onChange={() => setPick('')} title="Another folder" testId="screenshots-pick-other">
            <TextInput
              value={other}
              onChange={(e) => {
                setOther(e.target.value);
                setPick('');
              }}
              placeholder="~/Pictures/Screenshots"
              spellCheck={false}
              className="mt-1.5 py-1.5 font-mono text-[13px]"
              data-testid="screenshots-other"
              aria-label="Another folder"
            />
          </Choice>
        </div>
      </fieldset>
      {chosen?.protected && <MacPermission compact />}
      <p className="m-0 text-[12px] leading-snug text-faint">A folder just for screenshots works best: only new files are read, and only pictures that pass your rules go to Found.</p>
      {save.isError && (
        <Note tone="bad" testId="screenshots-error">
          {errorText(save.error)}
        </Note>
      )}
      <div className="flex flex-wrap gap-2">
        <Btn type="submit" kind="accent" disabled={save.isPending || !folder} data-testid="screenshots-save">
          {save.isPending ? 'Checking…' : saveLabel}
        </Btn>
        {onCancel && (
          <Btn kind="ghost" onClick={onCancel}>
            Not now
          </Btn>
        )}
      </div>
    </form>
  );
}

function Choice({ checked, onChange, title, children, testId }: { checked: boolean; onChange: () => void; title: string; children: ReactNode; testId: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ring-2 transition ${checked ? 'bg-surface ring-accent' : 'bg-sunk/60 ring-transparent hover:ring-line'}`} data-testid={testId}>
      <input type="radio" name="screenshots-folder" checked={checked} onChange={onChange} className="mt-1 accent-[var(--accent)]" />
      <span className="min-w-0 flex-1">
        <span className="block break-all font-mono text-[13px] font-semibold">{title}</span>
        <span className="block text-[12.5px] text-muted">{children}</span>
      </span>
    </label>
  );
}
