// New / edit project (SPEC R6): name, description, dates (no end = ongoing), status, company (or a new one, inline),
// linked repos (pick one, or add one by its folder or remote URL), and the tape colour: twelve swatches or any colour.
import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import type { CompanyEntry, ProjectEntry, ProjectStatus, RepoEntry } from '../../shared/api.ts';
import { createCompany, createProject, createRepo, isApiError, updateProject, type ProjectInput } from '../api/client.ts';
import { queryKeys } from '../api/queries.ts';
import { Btn, ColourPicker, Dialog, Field, TextArea, TextInput, inputCls } from '../kit/index.ts';
import { PROJECT_SWATCHES, inkOn, safeColour } from '../lib/colour.ts';
import { todayIso } from '../lib/dates.ts';

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived (hidden from pickers and the timeline)' },
];

const NEW_COMPANY = '__new__';

interface Form {
  name: string;
  description: string;
  start: string;
  end: string;
  ongoing: boolean;
  status: ProjectStatus;
  companyId: string;
  newCompany: string;
  newRole: string;
  repoIds: string[];
  color: string;
}

function initial(p: ProjectEntry | undefined, nextColour: string): Form {
  return {
    name: p?.name ?? '',
    description: p?.description ?? '',
    start: p?.start ?? todayIso(),
    end: p?.end ?? '',
    ongoing: p ? p.end === null : true,
    status: p?.status ?? 'active',
    companyId: p?.companyId ?? '',
    newCompany: '',
    newRole: '',
    repoIds: p?.repoIds ?? [],
    color: p?.color ?? nextColour,
  };
}

/** A folder (`/…`, `~/…`, `C:\…`) or else a remote URL. */
const looksLikePath = (s: string) => /^(~|\/|[A-Za-z]:[\\/])/.test(s.trim());

export function ProjectDialog({
  open,
  project,
  projects,
  companies,
  repos,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** Absent: a new project. */
  project?: ProjectEntry;
  projects: ProjectEntry[];
  companies: CompanyEntry[];
  repos: RepoEntry[];
  onClose: () => void;
  onSaved: (p: ProjectEntry) => void;
}) {
  const qc = useQueryClient();
  const nextColour = PROJECT_SWATCHES[projects.length % PROJECT_SWATCHES.length];
  const [f, setF] = useState<Form>(() => initial(project, nextColour));
  const [etag, setEtag] = useState(project?.etag);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [repoText, setRepoText] = useState('');
  const [repoError, setRepoError] = useState<string | null>(null);
  const [repoBusy, setRepoBusy] = useState(false);

  // a fresh form each time it opens (not while it's open: a live refresh mustn't wipe what's being typed)
  useEffect(() => {
    if (!open) return;
    setF(initial(project, nextColour));
    setEtag(project?.etag);
    setError(null);
    setConflict(false);
    setRepoText('');
    setRepoError(null);
  }, [open, project?.id]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const endBeforeStart = !f.ongoing && f.end && f.start && f.end < f.start;
  const nameMissing = !f.name.trim();
  const newCompanyMissing = f.companyId === NEW_COMPANY && !f.newCompany.trim();
  const canSave = !busy && !nameMissing && !!f.start && !endBeforeStart && !newCompanyMissing && (f.ongoing || !!f.end);

  const linked = f.repoIds.map((id) => repos.find((r) => r.id === id) ?? { id, name: 'a removed repo', host: 'local', tracked: false, etag: '' });
  const unlinked = repos.filter((r) => !f.repoIds.includes(r.id));

  async function addRepo() {
    const t = repoText.trim();
    if (!t) return;
    setRepoBusy(true);
    setRepoError(null);
    try {
      const { repo } = await createRepo(looksLikePath(t) ? { localPath: t } : { remoteUrl: t });
      await qc.invalidateQueries({ queryKey: queryKeys.repos });
      setF((x) => (x.repoIds.includes(repo.id) ? x : { ...x, repoIds: [...x.repoIds, repo.id] }));
      setRepoText('');
    } catch (e) {
      setRepoError(isApiError(e) ? e.message : 'That repo couldn\'t be added.');
    } finally {
      setRepoBusy(false);
    }
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      let companyId: string | null = f.companyId || null;
      if (f.companyId === NEW_COMPANY) {
        const c = await createCompany({ name: f.newCompany.trim(), ...(f.newRole.trim() ? { role: f.newRole.trim() } : {}) });
        companyId = c.id;
        set('companyId', c.id); // so a failed project save doesn't create the company twice
        void qc.invalidateQueries({ queryKey: queryKeys.companies });
      }
      const body: ProjectInput = {
        name: f.name.trim(),
        start: f.start,
        end: f.ongoing ? null : f.end,
        status: f.status,
        companyId,
        repoIds: f.repoIds,
        color: safeColour(f.color),
      };
      const desc = f.description.trim();
      if (desc) body.description = desc;
      else if (project?.description) body.description = null;
      const saved = project ? await updateProject(project.id, body, etag) : await createProject(body);
      await qc.invalidateQueries({ queryKey: queryKeys.projects });
      onSaved(saved);
    } catch (err) {
      if (isApiError(err, 'conflict')) {
        setConflict(true);
        setError('This project was changed somewhere else (in another tab, or its file by hand) since you opened it.');
      } else setError(isApiError(err) ? err.message : 'Couldn\'t save. Is BragDoc still running?');
    } finally {
      setBusy(false);
    }
  }

  const c = safeColour(f.color);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      tape={c}
      title={project ? `Edit ${project.name}` : 'New project'}
      sub={project ? undefined : 'A piece of work with dates and a colour. Achievements get tagged with it.'}
      data-testid="project-dialog"
      footer={
        <>
          <Btn kind="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn kind="go" type="submit" form="project-form" disabled={!canSave} data-testid="project-save">
            {busy ? 'Saving…' : project ? 'Save' : 'Create project'}
          </Btn>
        </>
      }
    >
      <form id="project-form" onSubmit={save} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-xl bg-bad/10 px-3.5 py-2.5 text-[13.5px] font-semibold text-bad ring-1 ring-bad/30">
            {error}
            {conflict && project && (
              <button
                type="button"
                className="ml-2 underline"
                onClick={() => {
                  const latest = projects.find((p) => p.id === project.id);
                  if (latest) {
                    setF(initial(latest, nextColour));
                    setEtag(latest.etag);
                  }
                  setConflict(false);
                  setError(null);
                }}
              >
                Load the latest
              </button>
            )}
          </div>
        )}
        <Field label="Name" error={f.name && nameMissing ? 'Give it a name' : undefined}>
          <TextInput value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Search relevance v2" autoFocus data-testid="project-name" />
        </Field>
        <Field label="Description" hint="Optional: a line or two about it.">
          <TextArea value={f.description} onChange={(e) => set('description', e.target.value)} className="min-h-16" rows={2} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Started">
            <TextInput type="date" value={f.start} onChange={(e) => set('start', e.target.value)} required data-testid="project-start" />
          </Field>
          <Field label="Ended" error={endBeforeStart ? 'It ends before it starts' : !f.ongoing && !f.end ? 'Pick an end date, or tick "Still going"' : undefined}>
            <TextInput type="date" value={f.ongoing ? '' : f.end} disabled={f.ongoing} onChange={(e) => set('end', e.target.value)} min={f.start} data-testid="project-end" />
          </Field>
        </div>
        <label className="-mt-2 flex w-fit cursor-pointer items-center gap-2 text-[13.5px] font-semibold text-muted">
          <input type="checkbox" checked={f.ongoing} onChange={(e) => set('ongoing', e.target.checked)} className="size-4 accent-[var(--accent)]" data-testid="project-ongoing" />
          Still going (no end date yet)
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select value={f.status} onChange={(e) => set('status', e.target.value as ProjectStatus)} className={inputCls}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Company" hint="Optional.">
            <select value={f.companyId} onChange={(e) => set('companyId', e.target.value)} className={inputCls} data-testid="project-company">
              <option value="">No company</option>
              {companies.map((co) => (
                <option key={co.id} value={co.id}>
                  {co.name}
                </option>
              ))}
              {f.companyId && f.companyId !== NEW_COMPANY && !companies.some((co) => co.id === f.companyId) && <option value={f.companyId}>A removed company</option>}
              <option value={NEW_COMPANY}>+ New company…</option>
            </select>
          </Field>
        </div>
        {f.companyId === NEW_COMPANY && (
          <div className="grid gap-4 rounded-2xl bg-sunk/60 p-3 sm:grid-cols-2">
            <Field label="New company's name">
              <TextInput value={f.newCompany} onChange={(e) => set('newCompany', e.target.value)} placeholder="Cyberdyne" autoFocus data-testid="project-new-company" />
            </Field>
            <Field label="Your role there" hint="Optional.">
              <TextInput value={f.newRole} onChange={(e) => set('newRole', e.target.value)} placeholder="Senior Engineer" />
            </Field>
          </div>
        )}

        <div>
          <div className="text-[12.5px] font-semibold text-muted">Repos</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2" data-testid="project-repos">
            {linked.length === 0 && <span className="text-[13px] text-faint">None linked yet.</span>}
            {linked.map((r) => (
              <span key={r.id} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-sunk py-1 pl-2.5 pr-1 font-mono text-[12px] text-muted" title={r.remoteUrl ?? r.localPath ?? r.name}>
                <span className="truncate">{r.name}</span>
                <button type="button" aria-label={`Unlink ${r.name}`} onClick={() => set('repoIds', f.repoIds.filter((x) => x !== r.id))} className="rounded p-0.5 hover:bg-line hover:text-ink">
                  <X aria-hidden className="size-3.5" />
                </button>
              </span>
            ))}
            {unlinked.length > 0 && (
              <select
                value=""
                onChange={(e) => e.target.value && set('repoIds', [...f.repoIds, e.target.value])}
                className="rounded-lg bg-sunk px-2 py-1 text-[12.5px] text-muted ring-1 ring-line"
                aria-label="Link a repo"
                data-testid="project-link-repo"
              >
                <option value="">Link a repo…</option>
                {unlinked.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <TextInput
              value={repoText}
              onChange={(e) => setRepoText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void addRepo();
                }
              }}
              placeholder="Add one: ~/Code/my-app or github.com/owner/repo"
              aria-label="Add a repo by its folder or URL"
              aria-invalid={repoError ? true : undefined}
              className="!py-2 text-[13.5px]"
              data-testid="project-add-repo"
            />
            <Btn size="sm" onClick={() => void addRepo()} disabled={!repoText.trim() || repoBusy} className="shrink-0">
              <Plus aria-hidden className="size-3.5" /> {repoBusy ? 'Adding…' : 'Add'}
            </Btn>
          </div>
          {repoError ? (
            <span role="alert" className="mt-1 block text-[12px] font-semibold text-bad" data-testid="project-repo-error">
              {repoError}
            </span>
          ) : (
            <span className="mt-1 block text-[12px] text-faint">A folder is checked for a .git folder and its remote is read; nothing else on your disk is looked at.</span>
          )}
        </div>

        <div>
          <ColourPicker value={c} onChange={(v) => set('color', v)} />
          <div className="mt-2 flex items-center gap-2 text-[12px] text-faint">
            Preview:
            <span className="inline-flex max-w-[16rem] truncate rounded-xl px-3 py-1.5 font-grotesk text-[13px] font-bold ring-1 ring-black/10 dark:ring-white/15" style={{ background: c, color: inkOn(c) }}>
              {f.name.trim() || 'Your project'}
            </span>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
