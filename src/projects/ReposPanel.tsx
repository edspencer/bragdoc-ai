// Every repo BragDoc knows, at the foot of the Projects page: which projects each is linked to, adding one by its
// folder or remote URL, and deleting one (it's unlinked from projects and achievements, with Undo; D40).
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FolderGit2, Plus, Trash2 } from 'lucide-react';
import type { ProjectEntry, RepoEntry } from '../../shared/api.ts';
import { createRepo, deleteRepo, isApiError, restoreRepo } from '../api/client.ts';
import { queryKeys } from '../api/queries.ts';
import { Btn, Panel, ProjectPill, SectionTitle, TextInput, useToast } from '../kit/index.ts';

const looksLikePath = (s: string) => /^(~|\/|[A-Za-z]:[\\/])/.test(s.trim());

export function ReposPanel({ repos, projects }: { repos: RepoEntry[]; projects: ProjectEntry[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: queryKeys.repos }), qc.invalidateQueries({ queryKey: queryKeys.projects })]);

  async function add() {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    setError(null);
    try {
      const r = await createRepo(looksLikePath(t) ? { localPath: t } : { remoteUrl: t });
      await refresh();
      setText('');
      toast({ msg: r.created ? `Added ${r.repo.name}.` : `${r.repo.name} was already here.` });
    } catch (e) {
      setError(isApiError(e) ? e.message : 'That repo couldn\'t be added.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(r: RepoEntry) {
    try {
      const d = await deleteRepo(r.id, r.etag);
      void refresh();
      toast({
        msg: `Removed ${r.name}.`,
        undo: () =>
          void restoreRepo(r.id, d.detached)
            .then(refresh)
            .catch((e) => toast({ msg: isApiError(e) ? e.message : 'Couldn\'t undo.', tone: 'bad' })),
      });
    } catch (e) {
      toast({ msg: isApiError(e) ? e.message : 'Couldn\'t remove it.', tone: 'bad' });
    }
  }

  return (
    <Panel className="mt-14" tape="#5f6b7a">
      <div data-testid="repos-panel">
        <SectionTitle sub="Code repositories, linked to projects so BragDoc can tell which project a pull request belongs to.">Repos</SectionTitle>
        <div className="mt-4 flex gap-2">
          <TextInput
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void add();
              }
            }}
            placeholder="~/Code/my-app or github.com/owner/repo"
            aria-label="Add a repo by its folder or URL"
            aria-invalid={error ? true : undefined}
            data-testid="repos-add"
          />
          <Btn onClick={() => void add()} disabled={!text.trim() || busy} className="shrink-0">
            <Plus aria-hidden className="size-4" /> {busy ? 'Adding…' : 'Add repo'}
          </Btn>
        </div>
        {error ? (
          <span role="alert" className="mt-1 block text-[12.5px] font-semibold text-bad" data-testid="repos-error">
            {error}
          </span>
        ) : (
          <span className="mt-1 block text-[12px] text-faint">For a folder, BragDoc reads its .git/config for the remote. It doesn't look anywhere else on your disk.</span>
        )}
        {repos.length === 0 ? (
          <p className="m-0 mt-5 text-[14px] text-faint" data-testid="repos-empty">
            No repos yet.
          </p>
        ) : (
          <ul className="m-0 mt-5 list-none divide-y divide-line p-0">
            {repos.map((r) => {
              const linked = projects.filter((p) => p.repoIds.includes(r.id));
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5" data-testid="repo-row">
                  <FolderGit2 aria-hidden className="size-4 shrink-0 text-faint" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[13px] font-semibold">{r.name}</div>
                    <div className="truncate text-[12px] text-faint">{[r.localPath, r.remoteUrl].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    {linked.map((p) => (
                      <ProjectPill key={p.id} name={p.name} color={p.color} />
                    ))}
                  </div>
                  <Btn size="sm" kind="ghost" onClick={() => void remove(r)} aria-label={`Remove ${r.name}`}>
                    <Trash2 aria-hidden className="size-3.5" />
                  </Btn>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
}
