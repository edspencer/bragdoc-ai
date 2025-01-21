import React from 'react';
import type {
  Company as CompanyType,
  Project as ProjectType,
} from '@/lib/db/schema';

export function Company({ company }: { company: CompanyType }) {
  return (
    <company>
      <id>{company.id}</id>
      <name>{company.name}</name>
      <role>{company.role}</role>
      <start-date>{company.startDate.toLocaleDateString()}</start-date>
      <end-date>{company.endDate?.toLocaleDateString() || 'Present'}</end-date>
    </company>
  );
}

export function Companies({ companies }: { companies: CompanyType[] }) {
  return (
    <companies>
      {companies.map((company) => (
        <Company key={company.id} company={company} />
      ))}
    </companies>
  );
}

export function Project({ project }: { project: ProjectType }) {
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
      {projects.map((project) => (
        <Project key={project.id} project={project} />
      ))}
    </projects>
  );
}
