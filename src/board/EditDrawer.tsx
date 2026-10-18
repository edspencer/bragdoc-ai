// The edit drawer (SPEC R5): title, summary, body, dates, impact, projects, repos, and the evidence (add files, a
// link or a quote; take any off), then Save. Archive / unarchive and Remove (with Undo) live here too. A native
// <dialog> (focus trapped, Esc closes, the page behind inert), sliding in from the right; full screen on a phone.
//
// Saves send the ETag the drawer was opened with (If-Match): if the file changed meanwhile (a hand edit, an agent),
// the save is refused with a 409 and the drawer offers to load the new version rather than overwrite it.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Archive, ArchiveRestore, Link2, Loader2, Paperclip, Quote, Trash2, X } from 'lucide-react';
import type { AiTidyResponse, EvidenceFile, ProjectEntry as Project, RepoEntry as Repo } from '../../shared/api.ts';
import { isHttpUrl } from '../../shared/links.ts';
import type { AchievementUpdate, Evidence, EvidenceInput } from '../../shared/schema/index.ts';
import { NETWORK_ERROR, isApiError, previewLink, updateAchievement, uploadEvidence, type AchievementItem } from '../api/client.ts';
import { Btn, Field, TextArea, TextInput, inputCls, useToast } from '../kit/index.ts';
import { MAX_UPLOAD_BYTES, linkEvidence, localPreview } from './composer.ts';
import { describe } from './evidence.ts';
import { ImpactPicker, ProjectPicker, RepoPicker } from './pickers.tsx';
import { TidyButton, TidySheet, TidyStatus } from './TidySheet.tsx';
import { useTidy, useTidyAvailability, type TidyKey } from './tidy.ts';

interface Draft {
  title: string;
  summary: string;
  body: string;
  happenedAt: string;
  endedAt: string;
  impact: number | undefined;
  projects: string[];
  repos: string[];
  evidence: EvidenceInput[];
}

const draftOf = (a: AchievementItem): Draft => ({
  title: a.title,
  summary: a.summary ?? '',
  body: a.body.replace(/\n$/, ''),
  happenedAt: a.happenedAt,
  endedAt: a.endedAt ?? '',
  impact: a.impact,
  projects: [...a.projects],
  repos: [...a.repos],
  evidence: a.evidence.map((e) => ({ ...e }) as EvidenceInput),
});

const KIND_ICON = { image: Paperclip, pdf: Paperclip, file: Paperclip, url: Link2, github_pr: Link2, quote: Quote } as const;

export function EditDrawer({
  a,
  projects,
  repos,
  onClose,
  onSaved,
  onArchive,
  onRemove,
  onReload,
}: {
  a: AchievementItem;
  projects: Project[];
  repos: Repo[];
  onClose: () => void;
  onSaved: (a: AchievementItem) => void;
  onArchive: (a: AchievementItem) => void;
  onRemove: (a: AchievementItem) => void;
  /** Fetch the latest copy (after a 409); resolves with it, or null if it's gone. */
  onReload: () => Promise<AchievementItem | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const toast = useToast();
  const [base, setBase] = useState(a);
  const [d, setD] = useState<Draft>(() => draftOf(a));
  const [files, setFiles] = useState<Record<string, EvidenceFile>>(a.files);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [quote, setQuote] = useState({ text: '', from: '', where: '' });
  const [adding, setAdding] = useState<null | 'link' | 'quote'>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editable = !base.broken && !base.readOnly;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  // Tidy this up (v0.2): only while AI and Tidy are on. It reads the achievement as saved, and changes only these
  // fields: your notes stay, under a suggested body (D78); nothing is saved until Save
  const avail = useTidyAvailability();
  const tidy = useTidy();
  const saved = draftOf(base);
  const unsaved = d.title !== saved.title || d.summary !== saved.summary || d.body !== saved.body;
  const applyTidy = (keys: TidyKey[], r: AiTidyResponse) => {
    const s = r.suggestion;
    setD((x) => ({
      ...x,
      ...(keys.includes('title') && s.title ? { title: s.title } : {}),
      ...(keys.includes('summary') && s.summary ? { summary: s.summary } : {}),
      ...(keys.includes('body') && s.body ? { body: x.body.trim() ? `${s.body}\n\n${x.body}` : s.body } : {}),
      ...(keys.includes('dates') && s.happenedAt ? { happenedAt: s.happenedAt, endedAt: s.endedAt ?? '' } : {}),
      ...(keys.includes('impact') && s.impact !== null ? { impact: s.impact } : {}),
      ...(keys.includes('projects') ? { projects: [...new Set([...x.projects, ...s.suggestedProjects])] } : {}),
    }));
    tidy.markUsed(keys);
  };

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    const opener = document.activeElement as HTMLElement | null;
    if (!dlg.open) dlg.showModal();
    return () => {
      if (dlg.open) dlg.close();
      opener?.focus?.();
    };
  }, []);

  const addFiles = async (list: File[]) => {
    for (const f of list) {
      if (f.size > MAX_UPLOAD_BYTES) {
        toast({ msg: `“${f.name}” is over 25 MB, the most BragDoc keeps per file.`, tone: 'bad' });
        continue;
      }
      if (!f.size) continue;
      setUploading((n) => n + 1);
      try {
        const r = await uploadEvidence(f);
        setFiles((x) => ({ ...x, [r.file.sha256]: r.file }));
        setD((x) => (x.evidence.some((e) => e.blob === r.file.sha256) ? x : { ...x, evidence: [...x.evidence, r.evidence as EvidenceInput] }));
      } catch (e) {
        toast({ msg: isApiError(e, NETWORK_ERROR) ? `Couldn't add “${f.name}”: BragDoc isn't answering.` : isApiError(e) ? e.message : `Couldn't add “${f.name}”.`, tone: 'bad' });
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const addLink = async () => {
    const url = link.trim();
    if (!isHttpUrl(url)) return setError('That isn’t a link: it should start with https://');
    setError(null);
    let p = localPreview(url);
    try {
      p = await previewLink(url);
    } catch {
      /* classified locally: nothing is lost but a title */
    }
    setD((x) => ({ ...x, evidence: [...x.evidence, linkEvidence(p) as EvidenceInput] }));
    setLink('');
    setAdding(null);
  };

  const addQuote = () => {
    if (!quote.text.trim()) return setError('A quote needs its words.');
    setError(null);
    const q = { text: quote.text.trim(), ...(quote.from.trim() ? { from: quote.from.trim() } : {}), ...(quote.where.trim() ? { where: quote.where.trim() } : {}) };
    setD((x) => ({ ...x, evidence: [...x.evidence, { kind: 'quote', quote: q }] }));
    setQuote({ text: '', from: '', where: '' });
    setAdding(null);
  };

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!d.title.trim()) return setError('It needs a title.');
    if (d.endedAt && d.endedAt < d.happenedAt) return setError('It can’t end before it started.');
    setError(null);
    setSaving(true);
    const body: AchievementUpdate = {
      title: d.title.trim(),
      summary: d.summary.trim() ? d.summary.trim() : null,
      body: d.body,
      happenedAt: d.happenedAt,
      endedAt: d.endedAt || null,
      impact: d.impact ?? null,
      ...(d.impact !== base.impact ? { impactSource: d.impact === undefined ? null : 'user' } : {}),
      projects: d.projects,
      repos: d.repos,
      evidence: d.evidence,
    };
    try {
      const saved = await updateAchievement(base.id, body, base.etag);
      onSaved(saved);
    } catch (err) {
      if (isApiError(err, 'conflict')) setConflict(true);
      else setError(isApiError(err, NETWORK_ERROR) ? 'Couldn’t save: BragDoc isn’t answering. Your changes are still here; try again.' : isApiError(err) ? err.message : 'Couldn’t save.');
    } finally {
      setSaving(false);
    }
  };

  const reload = async () => {
    const latest = await onReload();
    if (!latest) {
      toast({ msg: 'It was removed meanwhile.' });
      return onClose();
    }
    setBase(latest);
    setD(draftOf(latest));
    setFiles(latest.files);
    setConflict(false);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="edit-title"
      data-testid="edit-drawer"
      onClose={() => !ref.current?.open && onClose()}
      onCancel={(e) => {
        if (saving) e.preventDefault();
      }}
      onPaste={(e) => {
        // a picture or file pasted anywhere in the drawer (but not text into a field) becomes evidence
        if (e.clipboardData.files.length) {
          e.preventDefault();
          void addFiles([...e.clipboardData.files]);
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) void addFiles([...e.dataTransfer.files]);
      }}
      className="sb-drawer m-0 ml-auto h-full max-h-none w-full max-w-[560px] overflow-y-auto bg-transparent p-0 text-ink backdrop:bg-black/40"
    >
      <form onSubmit={save} className="sb-card min-h-full rounded-none p-5 sm:rounded-l-3xl sm:p-6" onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && (e.preventDefault(), void save())}>
        <div className="flex items-start gap-3">
          <h2 id="edit-title" className="m-0 flex-1 font-grotesk text-[24px] font-extrabold leading-tight">
            Edit
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted hover:bg-sunk hover:text-ink">
            <X aria-hidden className="size-5" />
          </button>
        </div>

        {!editable && (
          <p className="m-0 mt-3 rounded-xl bg-sunk p-3 text-[13px] text-warn" role="status">
            {base.readOnly ? 'This file was written by a newer BragDoc, so this one won’t change it.' : 'Its file has a problem (see Settings → Data), so BragDoc won’t overwrite it. Fix the file by hand, and it’ll be editable again.'}
          </p>
        )}
        {conflict && (
          <div className="mt-3 rounded-xl bg-sunk p-3 text-[13px]" role="alert" data-testid="edit-conflict">
            <b>It changed on disk while you were editing</b> (a hand edit, or an agent). Saving now would overwrite that.
            <div className="mt-2 flex gap-2">
              <Btn size="sm" kind="ink" onClick={() => void reload()}>
                Load the new version
              </Btn>
            </div>
          </div>
        )}

        {avail.show && (
          <div className="mt-3" data-testid="edit-tidy-area">
            <div className="flex flex-wrap items-center gap-2">
              <TidyButton avail={avail} tidy={tidy} can={editable && !saving} onTidy={() => void tidy.run({ achievementId: base.id }, avail.label)} testId="edit-tidy" />
              {unsaved && avail.ready && <span className="text-[11.5px] text-faint">It reads this as last saved.</span>}
            </div>
            <TidyStatus tidy={tidy} />
          </div>
        )}
        <TidySheet tidy={tidy} projects={projects} inert={avail.show ? null : 'AI or Tidy was switched off, so this suggestion can’t be used now. Nothing was changed.'} saveLabel="Save" onUse={applyTidy} />

        <fieldset disabled={!editable || saving} className="m-0 mt-4 space-y-4 border-0 p-0">
          <Field label="Title">
            <TextInput value={d.title} onChange={(e) => set('title', e.target.value)} required data-testid="edit-title" />
          </Field>
          <Field label="Summary" hint="A sentence or two, shown on the card.">
            <TextInput value={d.summary} onChange={(e) => set('summary', e.target.value)} data-testid="edit-summary" />
          </Field>
          <Field label="Notes" hint="Markdown. Everything else worth remembering.">
            <TextArea value={d.body} onChange={(e) => set('body', e.target.value)} rows={5} data-testid="edit-body" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="When">
              <TextInput type="date" value={d.happenedAt} required onChange={(e) => e.target.value && set('happenedAt', e.target.value)} data-testid="edit-date" />
            </Field>
            <Field label="Until" hint="For something that took a while.">
              <TextInput type="date" value={d.endedAt} min={d.happenedAt} onChange={(e) => set('endedAt', e.target.value)} />
            </Field>
          </div>
          <ImpactPicker value={d.impact} onChange={(n) => set('impact', n)} />
          <div>
            <div className="mb-1.5 text-[12.5px] font-semibold text-muted">Projects</div>
            <ProjectPicker projects={projects} value={d.projects} onChange={(v) => set('projects', v)} max={8} />
          </div>
          <div>
            <div className="mb-1.5 text-[12.5px] font-semibold text-muted">Repos</div>
            {repos.length || d.repos.length ? <RepoPicker repos={repos} value={d.repos} onChange={(v) => set('repos', v)} /> : <span className="text-[12px] text-faint">No repos yet</span>}
          </div>

          <div>
            <div className="mb-1.5 text-[12.5px] font-semibold text-muted">Evidence</div>
            <ul className="m-0 list-none space-y-1.5 p-0" data-testid="edit-evidence">
              {d.evidence.map((e, i) => {
                const Icon = KIND_ICON[e.kind];
                return (
                  <li key={e.id ?? `new-${i}`} className="flex items-center gap-2 rounded-xl bg-sunk px-3 py-2 text-[13px]">
                    <Icon aria-hidden className="size-3.5 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate">{describe({ id: '', ...e } as Evidence, files)}</span>
                    <span className="shrink-0 text-[11px] text-faint">{e.kind === 'github_pr' ? 'PR' : e.kind === 'url' ? 'link' : e.kind}</span>
                    <button type="button" aria-label={`Take off ${describe({ id: '', ...e } as Evidence, files)}`} onClick={() => set('evidence', d.evidence.filter((_, j) => j !== i))} className="rounded-full p-0.5 text-faint hover:text-bad">
                      <X aria-hidden className="size-3.5" />
                    </button>
                  </li>
                );
              })}
              {!d.evidence.length && <li className="text-[12.5px] text-faint">None yet. Paste or drop a file here, or add one below.</li>}
            </ul>
            <div className="mt-2 flex flex-wrap gap-2">
              <Btn size="sm" onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Paperclip aria-hidden className="size-3.5" />} Files
              </Btn>
              <Btn size="sm" onClick={() => setAdding(adding === 'link' ? null : 'link')} aria-expanded={adding === 'link'}>
                <Link2 aria-hidden className="size-3.5" /> Link
              </Btn>
              <Btn size="sm" onClick={() => setAdding(adding === 'quote' ? null : 'quote')} aria-expanded={adding === 'quote'}>
                <Quote aria-hidden className="size-3.5" /> Quote
              </Btn>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => (void addFiles([...(e.target.files ?? [])]), (e.target.value = ''))} />
            </div>
            {adding === 'link' && (
              <div className="mt-2 flex gap-2">
                <input
                  autoFocus
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.metaKey && !e.ctrlKey && (e.preventDefault(), void addLink())}
                  placeholder="Paste a PR link or any link"
                  aria-label="Link"
                  className={`${inputCls} py-1.5 text-[13px]`}
                />
                <Btn size="sm" kind="ink" onClick={() => void addLink()}>
                  Add
                </Btn>
              </div>
            )}
            {adding === 'quote' && (
              <div className="mt-2 space-y-2 rounded-xl bg-sunk p-3">
                <textarea autoFocus value={quote.text} onChange={(e) => setQuote({ ...quote, text: e.target.value })} placeholder="What they said" aria-label="Quote" rows={2} className={`${inputCls} bg-surface text-[13px]`} />
                <div className="flex gap-2">
                  <input value={quote.from} onChange={(e) => setQuote({ ...quote, from: e.target.value })} placeholder="Who" aria-label="Who said it" className={`${inputCls} bg-surface py-1.5 text-[13px]`} />
                  <input value={quote.where} onChange={(e) => setQuote({ ...quote, where: e.target.value })} placeholder="Where" aria-label="Where" className={`${inputCls} bg-surface py-1.5 text-[13px]`} />
                  <Btn size="sm" kind="ink" onClick={addQuote}>
                    Add
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </fieldset>

        {error && (
          <p className="m-0 mt-4 text-[13px] font-semibold text-bad" role="alert" data-testid="edit-error">
            {error}
          </p>
        )}

        <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap items-center gap-2 border-t-2 border-dashed border-line bg-surface px-5 py-4 sm:-mx-6 sm:px-6">
          <Btn type="submit" kind="accent" disabled={!editable || saving || uploading > 0 || conflict} data-testid="edit-save">
            {saving ? 'Saving…' : 'Save'}
          </Btn>
          <Btn onClick={onClose}>Cancel</Btn>
          <span className="ml-auto flex gap-2">
            <Btn size="sm" kind="ghost" disabled={!editable || saving} onClick={() => onArchive(base)} data-testid="edit-archive">
              {base.archived ? <ArchiveRestore aria-hidden className="size-3.5" /> : <Archive aria-hidden className="size-3.5" />}
              {base.archived ? 'Unarchive' : 'Archive'}
            </Btn>
            <Btn size="sm" kind="danger" disabled={saving || !!base.readOnly} onClick={() => onRemove(base)} data-testid="edit-remove">
              <Trash2 aria-hidden className="size-3.5" /> Remove
            </Btn>
          </span>
        </div>
      </form>
    </dialog>
  );
}
