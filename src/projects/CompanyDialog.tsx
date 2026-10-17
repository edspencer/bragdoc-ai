// New / edit company (SPEC R6: name, role, start, end; all optional but the name), and deleting one: its projects
// move to "No company", with Undo (D40).
import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CompanyEntry, ProjectEntry } from '../../shared/api.ts';
import { createCompany, deleteCompany, isApiError, restoreCompany, updateCompany } from '../api/client.ts';
import { queryKeys } from '../api/queries.ts';
import { Btn, Dialog, Field, TextInput, useToast } from '../kit/index.ts';

export function CompanyDialog({ open, company, projects, onClose }: { open: boolean; company?: CompanyEntry; projects: ProjectEntry[]; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(company?.name ?? '');
    setRole(company?.role ?? '');
    setStart(company?.start ?? '');
    setEnd(company?.end ?? '');
    setError(null);
    setConfirming(false);
  }, [open, company?.id]);

  const theirs = company ? projects.filter((p) => p.companyId === company.id) : [];
  const endBeforeStart = !!(start && end && end < start);
  const canSave = !busy && !!name.trim() && !endBeforeStart;
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: queryKeys.companies }), qc.invalidateQueries({ queryKey: queryKeys.projects })]);

  async function save(e?: FormEvent) {
    e?.preventDefault();
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      if (company) await updateCompany(company.id, { name: name.trim(), role: role.trim() || null, start: start || null, end: end || null }, company.etag);
      else await createCompany({ name: name.trim(), ...(role.trim() ? { role: role.trim() } : {}), ...(start ? { start } : {}), ...(end ? { end } : {}) });
      await refresh();
      onClose();
    } catch (err) {
      setError(isApiError(err, 'conflict') ? 'This company was changed somewhere else since you opened it. Close and open it again.' : isApiError(err) ? err.message : 'Couldn\'t save.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!company) return;
    setBusy(true);
    try {
      const r = await deleteCompany(company.id, company.etag);
      void refresh();
      onClose();
      toast({
        msg: `Deleted ${company.name}.${r.detached.projects.length ? ` Its projects are in "No company".` : ''}`,
        undo: () =>
          void restoreCompany(company.id, r.detached)
            .then(refresh)
            .catch((e) => toast({ msg: isApiError(e) ? e.message : 'Couldn\'t undo.', tone: 'bad' })),
      });
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Couldn\'t delete.');
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={company ? `Edit ${company.name}` : 'New company'}
      sub={company ? undefined : 'Somewhere you worked. Projects can belong to one, or to none.'}
      data-testid="company-dialog"
      footer={
        confirming ? (
          <>
            <span className="mr-auto text-[13.5px] text-muted" data-testid="company-confirm">
              {theirs.length ? `Its ${theirs.length === 1 ? 'project moves' : `${theirs.length} projects move`} to "No company".` : 'It has no projects.'} You can undo.
            </span>
            <Btn kind="ghost" onClick={() => setConfirming(false)}>
              Keep it
            </Btn>
            <Btn kind="danger" onClick={() => void remove()} disabled={busy} data-testid="company-delete-confirm">
              Delete
            </Btn>
          </>
        ) : (
          <>
            {company && (
              <Btn kind="danger" size="sm" className="mr-auto" onClick={() => setConfirming(true)} data-testid="company-delete">
                Delete company
              </Btn>
            )}
            <Btn kind="ghost" onClick={onClose}>
              Cancel
            </Btn>
            <Btn kind="go" type="submit" form="company-form" disabled={!canSave} data-testid="company-save">
              {busy ? 'Saving…' : company ? 'Save' : 'Add company'}
            </Btn>
          </>
        )
      }
    >
      <form id="company-form" onSubmit={save} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-xl bg-bad/10 px-3.5 py-2.5 text-[13.5px] font-semibold text-bad ring-1 ring-bad/30">
            {error}
          </div>
        )}
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Cyberdyne" autoFocus data-testid="company-name" />
        </Field>
        <Field label="Your role" hint="Optional.">
          <TextInput value={role} onChange={(e) => setRole(e.target.value)} placeholder="Senior Engineer" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Started" hint="Optional.">
            <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Left" hint={endBeforeStart ? undefined : 'Empty while you still work there.'} error={endBeforeStart ? 'That\'s before you started' : undefined}>
            <TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} min={start || undefined} />
          </Field>
        </div>
      </form>
    </Dialog>
  );
}
