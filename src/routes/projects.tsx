// Projects (SPEC R6): the career timeline (a Gantt of projects in company swimlanes), the selected project's pile
// under it, and the repos list. `?p=<id>` is the selected project, so a link (or a reload) keeps it.
import { useMemo, useState } from 'react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';
import type { CompanyEntry, ProjectEntry, ProjectsResponse } from '../../shared/api.ts';
import { deleteProject, isApiError, restoreProject, updateProject } from '../api/client.ts';
import { queryKeys, useCompanies, useProjects, useRepos } from '../api/queries.ts';
import { Btn, Card, Dialog, FilterChip, Hand, PageTitle, useToast } from '../kit/index.ts';
import { todayIso } from '../lib/dates.ts';
import { CompanyDialog } from '../projects/CompanyDialog.tsx';
import { Gantt } from '../projects/Gantt.tsx';
import { Pile } from '../projects/Pile.tsx';
import { ProjectDialog } from '../projects/ProjectDialog.tsx';
import { ReposPanel } from '../projects/ReposPanel.tsx';
import { ExampleBanner } from '../onboarding/ExampleData.tsx';

export const Route = createFileRoute('/projects')({
  component: Projects,
  validateSearch: (s: Record<string, unknown>): { p?: string } => (typeof s.p === 'string' && s.p ? { p: s.p } : {}),
});

/** The project to show when none is picked: the latest ongoing one, else the one that ended last. */
function defaultProject(ps: ProjectEntry[], today: string): ProjectEntry | undefined {
  return [...ps].sort((a, b) => ((a.end ?? today) !== (b.end ?? today) ? ((a.end ?? today) < (b.end ?? today) ? 1 : -1) : a.start < b.start ? 1 : -1))[0];
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function Projects() {
  const { p: selectedId } = Route.useSearch();
  const navigate = useNavigate({ from: '/projects' });
  const qc = useQueryClient();
  const toast = useToast();
  const projectsQ = useProjects();
  const companiesQ = useCompanies();
  const reposQ = useRepos();
  const today = todayIso();
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<{ project?: ProjectEntry } | null>(null);
  const [companyEditing, setCompanyEditing] = useState<{ company?: CompanyEntry } | null>(null);
  const [deleting, setDeleting] = useState<ProjectEntry | null>(null);

  const all = projectsQ.data?.projects ?? [];
  const companies = companiesQ.data?.companies ?? [];
  const repos = reposQ.data?.repos ?? [];
  const archivedCount = all.filter((p) => p.status === 'archived').length;
  const shown = useMemo(() => all.filter((p) => showArchived || p.status !== 'archived'), [all, showArchived]);
  const selected = all.find((p) => p.id === selectedId) ?? defaultProject(shown, today);
  const select = (id: string | undefined) => void navigate({ search: id ? { p: id } : {}, replace: true, resetScroll: false });

  const loading = projectsQ.isPending || companiesQ.isPending;
  const failed = projectsQ.isError || companiesQ.isError;
  const sub =
    all.length === 0
      ? 'What you worked on, when, and for whom.'
      : `${companies.length ? `${plural(companies.length, 'company', 'companies')}, ` : ''}${plural(all.length - archivedCount, 'project', 'projects')}${archivedCount ? ` (and ${archivedCount} archived)` : ''}. Tap a bar to see its pile.`;

  async function confirmDelete(p: ProjectEntry, archiveInstead: boolean) {
    setDeleting(null);
    try {
      if (archiveInstead) {
        await updateProject(p.id, { status: 'archived' }, p.etag);
        toast({ msg: `Archived ${p.name}. It's hidden from pickers and the timeline.` });
        void qc.invalidateQueries({ queryKey: queryKeys.projects });
        return;
      }
      const r = await deleteProject(p.id, p.etag);
      // drop it from the page at once (its pile would otherwise refetch a summary that's now a 404), then refresh
      qc.setQueryData<ProjectsResponse>(queryKeys.projects, (d) => d && { projects: d.projects.filter((x) => x.id !== p.id) });
      qc.removeQueries({ queryKey: queryKeys.projectSummary(p.id) });
      select(undefined);
      void qc.invalidateQueries({ queryKey: queryKeys.projects });
      toast({
        msg: `Deleted ${p.name}.${r.detached.achievements.length ? ` ${plural(r.detached.achievements.length, 'achievement was', 'achievements were')} untagged.` : ''}`,
        undo: () =>
          void restoreProject(p.id, r.detached)
            .then(() => qc.invalidateQueries({ queryKey: queryKeys.projects }))
            // the toast outlives the page: only pick it if Projects is still what's showing
            .then(() => window.location.pathname === '/projects' && select(p.id))
            .catch((e) => toast({ msg: isApiError(e) ? e.message : 'Couldn\'t undo.', tone: 'bad' })),
      });
    } catch (e) {
      toast({ msg: isApiError(e, 'conflict') ? 'It changed somewhere else meanwhile; try again.' : isApiError(e) ? e.message : 'Couldn\'t delete it.', tone: 'bad' });
      void qc.invalidateQueries({ queryKey: queryKeys.projects });
    }
  }

  return (
    <div data-testid="projects-page">
      <PageTitle
        sub={sub}
        right={
          <>
            <Btn onClick={() => setCompanyEditing({})} data-testid="new-company">
              <Building2 aria-hidden className="size-4" /> New company
            </Btn>
            <Btn kind="accent" onClick={() => setEditing({})} data-testid="new-project">
              <Plus aria-hidden className="size-4" /> New project
            </Btn>
          </>
        }
      >
        Projects
      </PageTitle>
      <ExampleBanner />

      {failed ? (
        <p role="alert" className="mt-10 text-[15px] font-semibold text-bad">
          Couldn't load your projects. Is BragDoc still running?
        </p>
      ) : loading ? (
        <p className="mt-10 text-[15px] text-faint">Loading…</p>
      ) : all.length === 0 ? (
        <Card tape="#3b6cf6" as="section" className="mx-auto mt-12 max-w-2xl rotate-[-0.5deg] px-6 pb-6 pt-8 sm:px-8" data-testid="projects-empty">
          <Hand className="text-[26px] text-accent">No projects yet</Hand>
          <p className="m-0 mt-2 text-[15px] leading-relaxed text-muted">
            A project is a piece of work with dates and a colour of your choosing: a launch, a migration, a whole job. They line up here on a timeline,
            grouped by company if you like, and every achievement you tag with one lands in its pile.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Btn kind="accent" onClick={() => setEditing({})} data-testid="empty-new-project">
              <Plus aria-hidden className="size-4" /> New project
            </Btn>
            {companies.length === 0 && (
              <Btn onClick={() => setCompanyEditing({})}>
                <Building2 aria-hidden className="size-4" /> Add a company first
              </Btn>
            )}
          </div>
          <p className="m-0 mt-4 text-[13px] text-muted">
            Projects can start from your repos:{' '}
            <Link to="/welcome" search={{ step: 'code' }} className="font-semibold text-accent underline decoration-dotted underline-offset-2" data-testid="projects-find-repos">
              look for the ones on this computer
            </Link>
            , and give each a project as you add it.
          </p>
        </Card>
      ) : (
        <>
          {archivedCount > 0 && (
            <div className="mt-6">
              <FilterChip on={showArchived} onClick={() => setShowArchived((v) => !v)} label="Show archived" count={archivedCount} />
            </div>
          )}
          {shown.length > 0 || companies.length > 0 ? (
            <Gantt projects={shown} companies={companies} today={today} selected={selected?.id} onSelect={select} onEditCompany={(c) => setCompanyEditing({ company: c })} />
          ) : (
            <p className="mt-8 text-[14px] text-faint">Every project is archived.</p>
          )}
          {selected && <Pile key={selected.id} project={selected} today={today} onEdit={() => setEditing({ project: selected })} onDelete={() => setDeleting(selected)} />}
        </>
      )}

      {!loading && !failed && <ReposPanel repos={repos} projects={all} />}

      <ProjectDialog
        open={!!editing}
        project={editing?.project}
        projects={all}
        companies={companies}
        repos={repos}
        onClose={() => setEditing(null)}
        onSaved={(p) => {
          setEditing(null);
          if (p.status === 'archived') setShowArchived(true);
          select(p.id);
        }}
      />
      <CompanyDialog open={!!companyEditing} company={companyEditing?.company} projects={all} onClose={() => setCompanyEditing(null)} />
      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        size="sm"
        tape={deleting?.color}
        title={`Delete ${deleting?.name ?? ''}?`}
        data-testid="delete-dialog"
        footer={
          <>
            <Btn kind="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Btn>
            {deleting?.status !== 'archived' && <Btn onClick={() => deleting && void confirmDelete(deleting, true)}>Archive instead</Btn>}
            <Btn kind="danger" onClick={() => deleting && void confirmDelete(deleting, false)} data-testid="delete-confirm">
              Delete
            </Btn>
          </>
        }
      >
        <p className="m-0 text-[14.5px] leading-relaxed text-muted">
          {deleting?.achievements
            ? `${plural(deleting.achievements, 'achievement is', 'achievements are')} tagged with it. They stay on your board, just without this project.`
            : 'Nothing is tagged with it.'}{' '}
          You can undo straight after, and its file is kept in your data folder's backups.
        </p>
      </Dialog>
    </div>
  );
}
