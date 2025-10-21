// @ts-nocheck
import React from 'react';
import type {
  Company as CompanyType,
  Project as ProjectType,
  Repository,
  Commit as RepositoryCommit,
} from './types';
import type {
  FileStats as FileStatsType,
  FileDiff as FileDiffType,
} from '../../git/types';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Company elements
      company: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      companies: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      id: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      name: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      role: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'start-date': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'end-date': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;

      // Project elements
      project: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      projects: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      description: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      status: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'company-id': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;

      // Repository elements
      repository: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'remote-url': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;

      // Commit elements
      commit: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      message: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      hash: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      author: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      date: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;

      // File stats elements
      'file-stats': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'file-stat': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      path: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      additions: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      deletions: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;

      // Diff elements
      'file-diff': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'diff-content': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      note: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

export function Company({ company }: { company?: CompanyType }) {
  if (!company) {
    return null;
  }

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'Present';
    if (typeof date === 'string') return new Date(date).toLocaleDateString();
    return date.toLocaleDateString();
  };

  // @ts-ignore - Custom JSX elements for AI prompts
  return (
    <company key={company.id}>
      <id>{company.id}</id>
      <name>{company.name}</name>
      <role>{company.role}</role>
      <start-date>{formatDate(company.startDate)}</start-date>
      <end-date>{formatDate(company.endDate)}</end-date>
    </company>
  );
}

export function Companies({ companies }: { companies: CompanyType[] }) {
  // @ts-ignore - Custom JSX elements for AI prompts
  return (
    <companies>
      {companies?.map((company) => (
        <Company key={company.id} company={company} />
      ))}
    </companies>
  );
}

export function Project({ project }: { project?: ProjectType }) {
  if (!project) {
    return null;
  }

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'Present';
    if (typeof date === 'string') return new Date(date).toLocaleDateString();
    return date.toLocaleDateString();
  };

  // @ts-ignore - Custom JSX elements for AI prompts
  return (
    <project>
      <id>{project.id}</id>
      <name>{project.name}</name>
      <description>{project.description}</description>
      <status>{project.status}</status>
      <company-id>{project.companyId}</company-id>
      <start-date>{formatDate(project.startDate)}</start-date>
      <end-date>{formatDate(project.endDate)}</end-date>
      <remote-repo-url>{project.repoRemoteUrl}</remote-repo-url>
    </project>
  );
}

export function Projects({ projects }: { projects: ProjectType[] }) {
  // @ts-ignore - Custom JSX elements for AI prompts
  return (
    <projects>
      {projects?.map((project) => (
        <Project key={project.id} project={project} />
      ))}
    </projects>
  );
}

export function Commit({ commit }: { commit: RepositoryCommit }) {
  // @ts-ignore - Custom JSX elements for AI prompts
  return (
    <commit>
      <message>{commit?.message}</message>
      <hash>{commit?.hash}</hash>
      <author>
        {commit?.author?.name} - {commit?.author?.email}
      </author>
      <date>{commit?.date}</date>
      {commit?.stats && <FileStats stats={commit.stats} />}
      {commit?.diff && (
        <Diff diffs={commit.diff} truncated={commit.diffTruncated} />
      )}
    </commit>
  );
}

export function Repo({ repository }: { repository: Repository }) {
  // @ts-ignore - Custom JSX elements for AI prompts
  return (
    <repository>
      <name>{repository?.name}</name>
      <path>{repository?.path}</path>
      <remote-url>{repository?.remoteUrl}</remote-url>
    </repository>
  );
}

export function FileStats({ stats }: { stats?: FileStatsType[] }) {
  if (!stats || stats.length === 0) {
    return null;
  }

  // @ts-ignore - Custom JSX elements for AI prompts
  return (
    <file-stats>
      {stats.map((stat, index) => (
        <file-stat key={index}>
          <path>{stat.path}</path>
          <additions>{stat.additions}</additions>
          <deletions>{stat.deletions}</deletions>
        </file-stat>
      ))}
    </file-stats>
  );
}

export function Diff({
  diffs,
  truncated,
}: { diffs?: FileDiffType[]; truncated?: boolean }) {
  if (!diffs || diffs.length === 0) {
    return null;
  }

  // @ts-ignore - Custom JSX elements for AI prompts
  return (
    <>
      {diffs.map((fileDiff, index) => (
        <file-diff key={index}>
          <path>{fileDiff.path}</path>
          <diff-content>{fileDiff.diff}</diff-content>
          {fileDiff.isTruncated && (
            <note>This diff was truncated due to size limits</note>
          )}
        </file-diff>
      ))}
      {truncated && <note>Some files were omitted due to size limits</note>}
    </>
  );
}
