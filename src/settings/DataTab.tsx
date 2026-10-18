// Settings → Data (SPEC R2, R13): where the data folder is, what BragDoc couldn't read in it (Problems, live), its
// backups, anything it has to tell you (the old CLI's files moved aside, a broken config.yaml), and the slots the
// example data (PR16) fills, and the importer (PR12's ImportPanel).
import { useState } from 'react';
import { AlertTriangle, FolderOpen, Info } from 'lucide-react';
import type { FileProblem } from '../../shared/api.ts';
import { useBackups, useMeta, useProblems } from '../api/queries.ts';
import { Btn, Dot, Kicker, Panel, SectionTitle } from '../kit/index.ts';
import { ImportPanel } from '../import/ImportPanel.tsx';
import { CopyButton, LoadError, Loading, Slot } from './common.tsx';

const CODE_LABEL: Record<FileProblem['code'], string> = {
  syntax: 'YAML error',
  invalid: 'doesn’t fit the format',
  'future-version': 'from a newer BragDoc',
  dangling: 'missing reference',
  stray: 'unexpected file',
};

const whenFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function DataTab() {
  return (
    <div className="space-y-6" data-testid="settings-data">
      <SectionTitle sub="Your data is plain files in a folder on this computer. Open them in any editor, or let your agent edit them: BragDoc picks up the changes as you save.">
        Data
      </SectionTitle>
      <Notices />
      <DataFolder />
      <Problems />
      <Backups />
      {/* the hosted-export importer (PR12): dry run, then import */}
      <ImportPanel />
      {/* PR16 replaces this with "Remove example data" (shown only while example data is present) */}
      <Slot title="Example data" testId="slot-example-data">
        If you filled the board with example data to try BragDoc out, you’ll be able to remove all of it here in one click.
      </Slot>
    </div>
  );
}

/** What the server has to tell you (the old CLI's files moved aside, a broken config.yaml). Also on Sources. */
export function Notices() {
  const meta = useMeta();
  const notices = meta.data?.notices ?? [];
  if (!notices.length) return null;
  return (
    <div className="space-y-3" data-testid="notices">
      {notices.map((n) => (
        <div
          key={n.id}
          role={n.level === 'warning' ? 'alert' : 'status'}
          data-testid={`notice-${n.id}`}
          className={`flex max-w-3xl gap-3 rounded-2xl p-4 text-[13.5px] leading-relaxed ring-1 ${n.level === 'warning' ? 'bg-warn/12 ring-warn/40' : 'bg-surface/70 ring-line'}`}
        >
          {n.level === 'warning' ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden /> : <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />}
          <span className="min-w-0 break-words">{n.message}</span>
        </div>
      ))}
    </div>
  );
}

function DataFolder() {
  const meta = useMeta();
  return (
    <Panel tape="#e9961a">
      <div className="flex items-center gap-2">
        <FolderOpen className="size-4 text-muted" aria-hidden />
        <Kicker>Your data folder</Kicker>
      </div>
      {meta.isPending && <Loading what="where your data is" />}
      {meta.isError && <LoadError error={meta.error} what="where your data is" retry={() => void meta.refetch()} />}
      {meta.isSuccess && (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="min-w-0 break-all rounded-lg bg-sunk px-3 py-1.5 font-mono text-[14px]" data-testid="data-dir">
              {meta.data.dataDirDisplay}
            </code>
            <CopyButton text={meta.data.dataDir} what="the data folder’s path" testId="copy-data-dir" />
          </div>
          <p className="m-0 mt-3 max-w-2xl text-[13px] leading-relaxed text-muted">
            Achievements are markdown files; projects, companies and settings are YAML. Back the folder up, sync it, or keep it in git: it’s yours. BragDoc never sends it anywhere.
          </p>
        </>
      )}
    </Panel>
  );
}

function Problems() {
  const q = useProblems();
  const list = q.data?.problems ?? [];
  const errors = list.filter((p) => p.severity === 'error').length;
  return (
    <Panel>
      <SectionTitle as="h3" sub="Files BragDoc couldn’t read, or that point at something that isn’t there. It keeps going without them and never overwrites them: fix the file and it’s picked up straight away.">
        Problems
      </SectionTitle>
      <div className="mt-4" data-testid="problems">
        {q.isPending && <Loading what="problems" />}
        {q.isError && <LoadError error={q.error} what="the problems list" retry={() => void q.refetch()} />}
        {q.isSuccess && list.length === 0 && (
          <div className="flex items-center gap-2 text-[14px]" data-testid="problems-empty">
            <Dot tone="good" /> Every file reads cleanly.
          </div>
        )}
        {q.isSuccess && list.length > 0 && (
          <>
            <div className="mb-3 text-[13.5px] font-semibold" data-testid="problems-count">
              {list.length === 1 ? '1 problem' : `${list.length} problems`}
              {errors > 0 && errors < list.length ? ` (${errors} ${errors === 1 ? 'file' : 'files'} can’t be read)` : ''}
            </div>
            <ul className="m-0 list-none space-y-2 p-0">
              {list.map((p, i) => (
                <li key={`${p.file}-${p.code}-${i}`} className="rounded-xl bg-sunk px-3 py-2.5" data-testid="problem" data-severity={p.severity}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Dot tone={p.severity === 'error' ? 'bad' : 'warn'} label={p.severity === 'error' ? 'Error' : 'Warning'} />
                    <code className="min-w-0 break-all font-mono text-[12.5px] font-semibold">
                      {p.file}
                      {p.line ? `:${p.line}${p.col ? `:${p.col}` : ''}` : ''}
                    </code>
                    <span className="text-[11.5px] font-bold uppercase tracking-wide text-faint">{CODE_LABEL[p.code] ?? p.code}</span>
                  </div>
                  <div className="mt-1 break-words text-[13px] leading-snug text-muted">{p.message}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Panel>
  );
}

const SHOWN = 5;

function Backups() {
  const q = useBackups();
  const [all, setAll] = useState(false);
  const snaps = q.data?.snapshots ?? [];
  const shown = all ? snaps : snaps.slice(0, SHOWN);
  return (
    <Panel>
      <SectionTitle
        as="h3"
        sub={
          q.data
            ? `A snapshot of your files when BragDoc starts, and every hour while things change. It keeps the newest ${q.data.keepRecent}, plus one a day for ${q.data.keepDays} days. Deleted things go to backups/removed/, never straight to the bin.`
            : 'Snapshots of your files, taken as BragDoc runs.'
        }
      >
        Backups
      </SectionTitle>
      <div className="mt-4" data-testid="backups">
        {q.isPending && <Loading what="backups" />}
        {q.isError && <LoadError error={q.error} what="the backups list" retry={() => void q.refetch()} />}
        {q.isSuccess && snaps.length === 0 && (
          <div className="text-[13.5px] text-muted" data-testid="backups-empty">
            No snapshots yet. The first is taken once there’s something to back up.
          </div>
        )}
        {q.isSuccess && snaps.length > 0 && (
          <>
            <div className="mb-2 text-[13px] text-muted">
              {snaps.length === 1 ? '1 snapshot' : `${snaps.length} snapshots`} in <code className="font-mono text-[12.5px]">{q.data.dirDisplay}</code>
            </div>
            <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-2">
              {shown.map((s) => (
                <li key={s.name} className="flex items-baseline justify-between gap-3 rounded-lg bg-sunk px-3 py-1.5 text-[13px]" data-testid="backup">
                  <span>{fmtWhen(s.at)}</span>
                  <code className="truncate font-mono text-[11px] text-faint">{s.name}</code>
                </li>
              ))}
            </ul>
            {snaps.length > SHOWN && (
              <Btn size="sm" kind="ghost" className="mt-2 !px-0" onClick={() => setAll(!all)}>
                {all ? 'Show fewer' : `Show all ${snaps.length}`}
              </Btn>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : whenFmt.format(d);
}
