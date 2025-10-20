// @ts-nocheck
import React from 'react';
import type {
  Company as CompanyType,
  Project as ProjectType,
  Achievement as AchievementType,
} from '@/database/schema';

import type { Repository, Commit as RepositoryCommit } from './types';

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

      // Achievement elements
      achievement: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      achievements: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      title: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      summary: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      details: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'event-start': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'event-end': React.DetailedHTMLProps<
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
    }
  }
}

export function Company({ company }: { company?: CompanyType }) {
  if (!company) {
    return null;
  }

  // @ts-ignore - Custom JSX elements for AI prompts
  return (
    <company key={company.id}>
      <id>{company.id}</id>
      <name>{company.name}</name>
      <role>{company.role}</role>
      <start-date>{company.startDate?.toLocaleDateString()}</start-date>
      <end-date>{company.endDate?.toLocaleDateString() || 'Present'}</end-date>
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

  // @ts-ignore - Custom JSX elements for AI prompts
  return (
    <project>
      <id>{project.id}</id>
      <name>{project.name}</name>
      <description>{project.description}</description>
      <status>{project.status}</status>
      <company-id>{project.companyId}</company-id>
      <start-date>{project.startDate.toLocaleDateString()}</start-date>
      <end-date>{project.endDate?.toLocaleDateString() || 'Present'}</end-date>
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

export function Achievement({ achievement }: { achievement: AchievementType }) {
  // @ts-ignore - Custom JSX elements for AI prompts
  return (
    <achievement>
      <id>{achievement.id}</id>
      <achievement-title>{achievement.title}</achievement-title>
      <summary>{achievement.summary}</summary>
      <achievement-source>{achievement.source}</achievement-source>
      <event-start>{achievement.eventStart?.toLocaleDateString()}</event-start>
      <event-end>
        {achievement.eventEnd?.toLocaleDateString() || 'Present'}
      </event-end>
    </achievement>
  );
}

export function Achievements({
  achievements,
}: {
  achievements: AchievementType[];
}) {
  // @ts-ignore - Custom JSX elements for AI prompts
  return (
    <achievements>
      {achievements?.map((achievement) => (
        <Achievement key={achievement.id} achievement={achievement} />
      ))}
    </achievements>
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
