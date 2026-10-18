// The composer, drawn: a dashed tray ("Drop it here."), the text box, what's been added (prints, PDF pages, PR slabs,
// link and file chips, each with its upload state), and, once there's something, the footer: projects, repos, impact,
// the date and "Pin it". Adapted from the Scrapbook prototype's Board.tsx DropTray, without its demo buttons.
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useQueries } from '@tanstack/react-query';
import { AlertTriangle, FileText, ImageIcon, Link2, Loader2, Paperclip, RotateCw, X } from 'lucide-react';
import type { ProjectEntry as Project, RepoEntry as Repo } from '../../shared/api.ts';
import { getEvidenceOcr } from '../api/client.ts';
import { queryKeys, useEvidenceOcr } from '../api/queries.ts';
import { GithubMark, PdfPage, StickyQuote, formatBytes, inputCls } from '../kit/index.ts';
import { pasteKeys, type Composer, type Pending } from './composer.ts';
import { stem } from './evidence.ts';
import { ImpactPicker, ProjectPicker, RepoPicker } from './pickers.tsx';
import { TidyButton, TidySheet, TidyStatus } from './TidySheet.tsx';
import { useTidy, useTidyAvailability } from './tidy.ts';

export function DropTray({ c, dragging, projects, repos, onSubmit, saving }: { c: Composer; dragging: boolean; projects: Project[]; repos: Repo[]; onSubmit: () => void; saving: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const has = c.text.length > 0 || c.pending.length > 0;
  // Tidy this up (v0.2): only while AI and Tidy are on; it works from your text and the pictures whose text is read
  const avail = useTidyAvailability();
  const tidy = useTidy();
  const pictures = c.pending.flatMap((p) => (p.kind === 'file' && p.status === 'ready' && p.file?.mime?.startsWith('image/') && p.evidence?.blob ? [p.evidence.blob] : []));
  const ocr = useQueries({
    queries: pictures.map((sha) => ({
      queryKey: queryKeys.evidenceOcr(sha),
      queryFn: ({ signal }: { signal: AbortSignal }) => getEvidenceOcr(sha, signal),
      enabled: avail.show,
      refetchInterval: (q: { state: { data?: { status: string } } }) => (q.state.data?.status === 'pending' ? 1500 : false),
    })),
  });
  const readPictures = pictures.filter((_, i) => ocr[i]?.data?.status === 'done' && !!ocr[i]?.data?.text?.trim());
  const canTidy = !!c.text.trim() || readPictures.length > 0;
  const { close: closeTidy, phase } = tidy;
  // pinned (or emptied): the suggestion goes with what it was for
  useEffect(() => {
    if (!has && phase.kind !== 'idle') closeTidy();
  }, [has, phase.kind, closeTidy]);
  const reading = pictures.filter((_, i) => !ocr[i]?.data || ocr[i]?.data?.status === 'pending').length;
  const startTidy = () => {
    const text = c.tidySource();
    void tidy.run({ ...(text.trim() ? { text } : {}), ...(readPictures.length ? { evidenceShas: readPictures } : {}) }, avail.label);
  };
  const submit = () => c.canSubmit && !saving && onSubmit();
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };
  return (
    <section
      aria-label="Add to your board"
      data-testid="composer"
      onKeyDown={onKey}
      className={`relative mt-6 rounded-[28px] border-[2.5px] border-dashed p-4 backdrop-blur-sm transition sm:mt-8 sm:p-5 ${dragging ? 'scale-[1.01] border-accent bg-accent-soft/80' : 'sb-glass border-[#cbbfa9] focus-within:border-accent/70 dark:border-[#5a4d3e]'}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="relative min-w-0 flex-1">
          {!has && (
            <div aria-hidden className="pointer-events-none absolute left-1 top-0 select-none">
              <div className="font-grotesk text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[30px]">{dragging ? 'Let go!' : 'Drop it here.'}</div>
              <div className="mt-0.5 text-[14px] text-muted">Screenshots, PDFs, links, a few words. BragDoc sorts it out.</div>
            </div>
          )}
          <textarea
            value={c.text}
            readOnly={saving}
            onChange={(e) => c.setText(e.target.value)}
            rows={has ? 2 : 3}
            aria-label="What did you do? The first line is the title."
            data-testid="composer-text"
            className="relative block w-full resize-none bg-transparent font-grotesk text-[20px] font-semibold leading-snug text-ink outline-none focus-visible:outline-none [overflow-wrap:anywhere]"
          />
          {c.pending.length > 0 && (
            <ul className="m-0 mt-2 flex list-none flex-wrap items-end gap-4 p-0" aria-label="Added">
              {c.pending.map((p) => (
                <PendingBit key={p.pid} p={p} c={c} />
              ))}
            </ul>
          )}
          {c.stickies.length > 0 && (
            <ul className="m-0 mt-4 flex list-none flex-wrap items-start gap-4 p-0" aria-label="Quotes to pin">
              {c.stickies.map((q) => (
                <li key={q.sha} className="group relative w-[240px]" data-testid="composer-sticky">
                  <StickyQuote text={q.text} from={q.from} where={q.where} rotate={-1} />
                  <button
                    type="button"
                    onClick={() => c.removeSticky(q.sha)}
                    className="absolute -right-2 -top-2 rounded-full bg-ink p-1 text-bg opacity-80 shadow transition hover:opacity-100 focus-visible:opacity-100"
                    aria-label="Remove the quote"
                  >
                    <X aria-hidden className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <TidyStatus tidy={tidy} />
          <TidySheet tidy={tidy} projects={projects} inert={avail.show ? null : `AI or Tidy was switched off, so this suggestion can’t be used now.${phase.kind === 'done' && phase.used.length ? ' What you already used stays until you change it.' : ' Your text is as you left it.'}`} saveLabel="Pin it" onUse={(keys, r) => (c.applyTidy(keys, r), tidy.markUsed(keys))} />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:w-[240px] lg:flex-col lg:items-stretch">
          <Hint icon={<ImageIcon className="size-3.5" />} bg="#3b6cf6" label="Paste a screenshot" sub={pasteKeys()} onClick={() => void c.pasteFromClipboard('image')} />
          <Hint icon={<FileText className="size-3.5" />} bg="#ef5a3c" label="Add a PDF or file" sub="or drop" onClick={() => fileRef.current?.click()} testId="pick-files" />
          <Hint icon={<GithubMark className="size-3.5" />} bg="#1d1a17" label="Paste a PR link" sub="any link" onClick={() => void c.pasteFromClipboard('link')} />
          <span className="px-2 text-[12px] font-semibold text-muted">…or drag files anywhere on the page</span>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            data-testid="file-input"
            onChange={(e) => {
              c.addFiles([...(e.target.files ?? [])]);
              e.target.value = ''; // the same file again is a new pick
            }}
          />
        </div>
      </div>
      {has && (
        <div className="mt-4 space-y-3 border-t-2 border-dashed border-line pt-4">
          {c.summary !== null && (
            <label className="flex items-center gap-2 text-[12px] font-semibold text-muted">
              Summary
              <input value={c.summary} onChange={(e) => c.setSummary(e.target.value)} readOnly={saving} className={`${inputCls} py-1.5 text-[13.5px] font-normal text-ink`} data-testid="composer-summary" />
            </label>
          )}
          <ProjectPicker projects={projects} value={c.projects} onChange={c.setProjects} suggested={c.suggestedProjects} />
          <RepoPicker repos={repos} value={c.repos} onChange={c.setRepos} suggested={c.suggestedRepos} />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <ImpactPicker value={c.impact} onChange={c.setImpact} />
            <label className="flex items-center gap-2 text-[12px] font-semibold text-muted">
              When?
              <input type="date" value={c.date} required onChange={(e) => e.target.value && c.setDate(e.target.value)} className={`${inputCls} w-auto px-2.5 py-1 text-[13px]`} data-testid="composer-date" />
            </label>
            {c.endedAt !== null && (
              <label className="flex items-center gap-2 text-[12px] font-semibold text-muted">
                Until
                <input type="date" value={c.endedAt} min={c.date} onChange={(e) => c.setEndedAt(e.target.value)} className={`${inputCls} w-auto px-2.5 py-1 text-[13px]`} data-testid="composer-ended" />
              </label>
            )}
            <span className="ml-auto flex flex-wrap items-center justify-end gap-3">
              {avail.show && reading > 0 && (
                <span className="text-[11.5px] text-faint" data-testid="composer-tidy-reading">
                  {reading === 1 ? 'A picture is still being read: Tidy leaves its text out until it is.' : `${reading} pictures are still being read: Tidy leaves their text out until they are.`}
                </span>
              )}
              <TidyButton avail={avail} tidy={tidy} can={canTidy && !saving} onTidy={startTidy} testId="composer-tidy" />
              {c.busy && <span className="text-[12px] font-semibold text-muted">Adding…</span>}
              {c.failed && <span className="text-[12px] font-semibold text-bad">Retry or remove what didn&apos;t upload</span>}
              <span className="hidden text-[11px] text-faint sm:inline">⌘/Ctrl+Enter</span>
              <button
                type="button"
                onClick={submit}
                disabled={!c.canSubmit || saving}
                data-testid="pin-it"
                className="rounded-full bg-accent px-5 py-2 font-grotesk text-[15px] font-bold text-accent-ink shadow-[0_3px_0_var(--accent-shadow)] transition active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'Pinning…' : 'Pin it'}
              </button>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function Hint({ icon, bg, label, sub, onClick, testId }: { icon: ReactNode; bg: string; label: string; sub: string; onClick: () => void; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="flex items-center gap-2.5 rounded-full bg-surface px-1.5 py-1.5 pr-4 text-left text-[13px] font-semibold text-ink shadow-[0_2px_0_rgba(0,0,0,.06)] ring-1 ring-line transition hover:-translate-y-0.5"
    >
      <span aria-hidden className="flex size-7 items-center justify-center rounded-full text-white dark:ring-1 dark:ring-white/15" style={{ background: bg }}>
        {icon}
      </span>
      {label}
      <span className="ml-auto pl-2 text-[10.5px] font-medium text-faint">{sub}</span>
    </button>
  );
}

function PendingBit({ p, c }: { p: Pending; c: Composer }) {
  const label = p.kind === 'file' ? p.name : p.url;
  return (
    <li className="sb-pop-in group relative w-[170px]" data-testid="pending" data-kind={p.kind === 'file' ? 'file' : p.preview.kind} data-status={p.status}>
      {p.kind === 'file' && p.preview ? (
        <div className="sb-print rotate-[-2deg] p-1.5 pb-5">
          <img src={p.preview} alt="" className={`block h-20 w-full object-cover object-left-top ${p.status === 'uploading' ? 'opacity-60' : ''}`} />
          <div className="absolute bottom-0.5 left-2 right-2 truncate font-hand text-[14px] text-print-ink">{status(p) ?? 'added ✓'}</div>
        </div>
      ) : p.kind === 'file' && (p.file?.mime ?? p.type) === 'application/pdf' ? (
        <div className="flex items-end gap-2">
          <PdfPage title={stem(p.name)} className={`h-24 w-[72px] shrink-0 rotate-[2deg] ${p.status === 'uploading' ? 'opacity-60' : ''}`} />
          <span className="min-w-0 pb-1 text-[11px] font-semibold text-muted">
            <span className="line-clamp-2 break-words">{p.name}</span>
            {status(p) ?? formatBytes(p.bytes)}
          </span>
        </div>
      ) : p.kind === 'file' ? (
        <div className="rounded-xl border-2 border-dashed border-line bg-surface px-3 py-2.5 text-[12px]">
          <div className="flex items-center gap-1.5 text-[10.5px] text-muted">
            <Paperclip aria-hidden className="size-3" /> {status(p) ?? formatBytes(p.bytes)}
          </div>
          <div className="mt-0.5 line-clamp-2 break-words font-semibold">{p.name}</div>
        </div>
      ) : p.preview.kind === 'github_pr' ? (
        <div className="rounded-xl bg-slab px-3 py-2.5 text-[12px] text-slab-ink">
          <div className="flex items-center gap-1.5 text-[10.5px] opacity-70">
            <GithubMark className="size-3" /> {p.preview.repo.split('/')[1]} #{p.preview.number}
          </div>
          <div className={`mt-0.5 line-clamp-2 break-words font-semibold ${p.status === 'loading' ? 'animate-pulse' : ''}`}>
            {p.status === 'loading' ? 'Reading the link…' : p.preview.title || `${p.preview.repo}#${p.preview.number}`}
          </div>
          {p.status === 'ready' && !p.preview.title && <div className="mt-1 text-[10.5px] opacity-60">{p.preview.onBoard ? 'Already on your board' : 'Title: connect GitHub'}</div>}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-line bg-surface px-3 py-2.5 text-[12px]">
          <div className="flex items-center gap-1.5 text-[10.5px] text-muted">
            <Link2 aria-hidden className="size-3 text-accent" /> {p.preview.domain}
          </div>
          <div className="mt-0.5 line-clamp-2 break-all font-semibold">{p.url.replace(/^https?:\/\//, '')}</div>
        </div>
      )}
      {p.kind === 'file' && p.status === 'ready' && p.file?.mime?.startsWith('image/') && p.evidence?.blob && <QuoteOffer sha={p.evidence.blob} c={c} />}
      {p.status === 'error' && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-bad" role="alert">
          <AlertTriangle aria-hidden className="size-3.5 shrink-0" /> Didn&apos;t upload
          <button type="button" onClick={() => c.retry(p.pid)} className="ml-auto inline-flex items-center gap-1 rounded underline decoration-dotted underline-offset-2" data-testid="retry">
            <RotateCw aria-hidden className="size-3" /> Retry
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => c.remove(p.pid)}
        className="absolute -right-2 -top-2 rounded-full bg-ink p-1 text-bg opacity-80 shadow transition hover:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
        aria-label={`Remove ${label}`}
      >
        <X aria-hidden className="size-3" />
      </button>
    </li>
  );
}

function status(p: Extract<Pending, { kind: 'file' }>): ReactNode | null {
  if (p.status === 'uploading')
    return (
      <span className="inline-flex items-center gap-1">
        <Loader2 aria-hidden className="size-3 animate-spin" /> adding…
      </span>
    );
  if (p.status === 'error') return 'not added';
  return null;
}

/**
 * A pasted picture is read in the background (OCR, on this computer); when its text passes the screenshot rules (your
 * name near praise), offer the words as a sticky to pin with it (SPEC R5).
 */
function QuoteOffer({ sha, c }: { sha: string; c: Composer }) {
  const ocr = useEvidenceOcr(sha);
  const q = ocr.data?.quote;
  if (ocr.data?.status === 'pending')
    return (
      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-faint" data-testid="ocr-reading">
        <Loader2 aria-hidden className="size-3 animate-spin" /> reading the text…
      </div>
    );
  if (!q || c.stickies.some((x) => x.sha === sha)) return null;
  return (
    <button
      type="button"
      onClick={() => c.addSticky({ sha, ...q })}
      className="mt-1.5 block w-full rounded-lg bg-sticky px-2 py-1.5 text-left text-[11.5px] font-semibold leading-snug text-ink shadow-sm ring-1 ring-line transition hover:-translate-y-0.5"
      data-testid="ocr-quote-offer"
    >
      <span className="line-clamp-2 font-hand text-[15px] font-normal">“{q.text}”</span>
      <span className="text-accent">+ Add the quote as a sticky</span>
    </button>
  );
}
