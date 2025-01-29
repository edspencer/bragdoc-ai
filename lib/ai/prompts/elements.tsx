import React from 'react';
import type {
  Company as CompanyType,
  Project as ProjectType,
  Achievement as AchievementType,
} from '@/lib/db/schema';

import { Repository, Commit as RepositoryCommit } from './types';

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
      {achievements.map((achievement) => (
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

type PromptProps = {
  children?: React.ReactNode;
};

export const Prompt: React.FC<PromptProps> = ({ children }) => {
  return children;
};

export function Purpose({ children }: { children: React.ReactNode }) {
  return <purpose>{children}</purpose>;
}

export function Background({ children }: { children: React.ReactNode }) {
  return <background>{children}</background>;
}

export function Variables({ children }: { children: React.ReactNode }) {
  return <variables>{children}</variables>;
}

export function Instructions({
  instructions = [],
  children,
}: {
  instructions?: string[];
  children?: React.ReactNode;
}) {
  return (
    <instructions>
      {instructions.map((instruction) => (
        <Instruction
          key={instruction.replace(/\s/g, '')}
          dangerouslySetInnerHTML={{ __html: instruction }}
        />
      ))}
      {children}
    </instructions>
  );
}

export function Instruction({
  children,
  dangerouslySetInnerHTML,
}: {
  children?: React.ReactNode;
  dangerouslySetInnerHTML?: { __html: string };
}) {
  return (
    <instruction dangerouslySetInnerHTML={dangerouslySetInnerHTML}>
      {children}
    </instruction>
  );
}

export function UserInput({ children }: { children: React.ReactNode }) {
  return <user-input>{children}</user-input>;
}

export function Example({ children }: { children: React.ReactNode }) {
  return <example>{children}</example>;
}

export function Examples({
  examples = [],
  children,
}: {
  examples?: string[];
  children?: React.ReactNode;
}) {
  return (
    <examples>
      {examples.map((example, i) => (
        <example key={i} dangerouslySetInnerHTML={{ __html: example }} />
      ))}
      {children}
    </examples>
  );
}

export function InputFormat({
  children,
  title = 'You are provided with the following inputs:',
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return <input-format title={title}>{children}</input-format>;
}

export function OutputFormat({
  children,
  title = 'Your response should be formatted as:',
  format = '',
}: {
  children?: React.ReactNode;
  title?: string;
  format?: string;
}) {
  return (
    <output-format title={title}>
      {children} {format}
    </output-format>
  );
}

export function ChatHistory({ messages }: { messages: any[] }) {
  return (
    <chat-history>
      {messages?.map(({ role, content }) => (
        <message key={content.replace(/\s/g, '')}>
          {role}: {content}
        </message>
      ))}
    </chat-history>
  );
}
