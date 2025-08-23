import React from 'react';
import type {
  Company as CompanyType,
  Project as ProjectType,
  Achievement as AchievementType,
} from '@/lib/db/schema';

import type { Repository, Commit as RepositoryCommit } from './types';

export function Company({ company }: { company?: CompanyType }) {
  if (!company) {
    return null;
  }

  return (
    <company>
      <id>{company.id}</id>
      <name>{company.name}</name>
      <role>{company.role}</role>
      <start-date>{company.startDate?.toLocaleDateString()}</start-date>
      <end-date>{company.endDate?.toLocaleDateString() || 'Present'}</end-date>
    </company>
  );
}

export function Companies({ companies }: { companies: CompanyType[] }) {
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
  return (
    <projects>
      {projects?.map((project) => (
        <Project key={project.id} project={project} />
      ))}
    </projects>
  );
}

export function Achievement({ achievement }: { achievement: AchievementType }) {
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
  return (
    <achievements>
      {achievements?.map((achievement) => (
        <Achievement key={achievement.id} achievement={achievement} />
      ))}
    </achievements>
  );
}

export function Commit({ commit }: { commit: RepositoryCommit }) {
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
  return (
    <repository>
      <name>{repository?.name}</name>
      <path>{repository?.path}</path>
      <remote-url>{repository?.remoteUrl}</remote-url>
    </repository>
  );
}
