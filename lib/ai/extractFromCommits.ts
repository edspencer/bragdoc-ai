import { streamObject } from 'ai';
import { extractAchievementsModel } from '@/lib/ai';
import type { Achievement } from '../db/schema';
import type { RepositoryCommitHistory } from '@/types/commits';
import { achievementResponseSchema } from './llm-object-schema';

export type ExtractFromCommitsInput = {
  commits: RepositoryCommitHistory['commits'];
  repository: RepositoryCommitHistory['repository'];
  context: {
    companies: Array<{
      id: string;
      name: string;
      role: string;
      domain?: string;
      startDate: Date;
      endDate?: Date;
    }>;
    projects: Array<{
      id: string;
      name: string;
      companyId?: string;
      description: string;
      startDate?: Date;
      endDate?: Date;
    }>;
  };
};

export type ExtractedAchievement = Pick<
  Achievement,
  | 'title'
  | 'summary'
  | 'details'
  | 'eventDuration'
  | 'eventStart'
  | 'eventEnd'
  | 'companyId'
  | 'projectId'
  | 'impact'
  | 'impactSource'
  | 'impactUpdatedAt'
>;

export async function* extractFromCommits(
  input: ExtractFromCommitsInput,
): AsyncGenerator<ExtractedAchievement, void, unknown> {
  const commitsStr = input.commits
    .map(
      (commit) => `
Hash: ${commit.hash}
Author: ${commit.author.name} <${commit.author.email}>
Date: ${commit.date}
Message: ${commit.message}
${
  commit.prDetails
    ? `PR Title: ${commit.prDetails.title}
PR Description: ${commit.prDetails.description}
PR Number: ${commit.prDetails.number}`
    : ''
}
`,
    )
    .join('\n---\n');

  const companiesStr = input.context.companies
    .map(
      (company) => `
Name: ${company.name} (ID: ${company.id})
Role: ${company.role}
Domain: ${company.domain || 'N/A'}
Start Date: ${company.startDate}
End Date: ${company.endDate || 'Present'}
    `,
    )
    .join('\n');

  const projectsStr = input.context.projects
    .map(
      (project) => `
Name: ${project.name} (ID: ${project.id})
Company: ${project.companyId || 'N/A'}
Description: ${project.description}
Start Date: ${project.startDate || 'N/A'}
End Date: ${project.endDate || 'N/A'}
    `,
    )
    .join('\n');

  const prompt = `Extract achievements from the following git commits from repository "${input.repository.name}". 
Consider both commit messages and PR details (when available) to understand the full scope of each achievement.

Pay special attention to:
1. Feature launches or major changes
2. Bug fixes and their impact
3. Performance improvements with metrics
4. Architectural changes or refactoring
5. Documentation or process improvements

<commits>
${commitsStr}
</commits>

<context>
<companies>
${companiesStr}
</companies>

<projects>
${projectsStr}
</projects>
</context>

For each achievement found, provide:
1. A clear, action-oriented title (REQUIRED) that:
   - Starts with an action verb (e.g., Implemented, Fixed, Optimized)
   - Includes specific metrics when available (e.g., "40% reduction", "2x improvement")
   - Mentions specific systems or components affected
   - Is between 10 and 256 characters
   Example good titles:
   - "Implemented Real-time Search with 100ms Response Time"
   - "Fixed Memory Leak in Background Job Processing"
   - "Refactored Authentication System for 50% Better Performance"

2. A concise summary highlighting key changes and impact. Stick to what's in the commits.
3. Detailed description including technical context and significance. Do not speculate beyond what's in the commits.
4. Event duration (day/week/month/quarter/half year/year) based on commit dates and scope of changes
5. Related company ID (or null if none)
6. Related project ID (or null if none)
7. Event start date from the commit date
8. Event end date if there are multiple related commits
9. Impact rating (1-3) based on these criteria:
   - Level 1 (Low): Simple fixes, minor improvements, isolated changes
   - Level 2 (Medium): Feature implementations, notable improvements, component-level changes
   - Level 3 (High): Major features, architectural changes, system-wide improvements

Group related commits into single achievements when they represent parts of the same feature or fix.
Each achievement should be complete and self-contained.`;

  const { elementStream } = await streamObject({
    model: extractAchievementsModel,
    prompt,
    temperature: 0,
    output: 'array',
    schema: achievementResponseSchema,
  });

  for await (const element of elementStream) {
    yield {
      title: element.title,
      summary: element.summary || '',
      details: element.details || '',
      eventDuration: element.eventDuration,
      eventStart: element.eventStart ? new Date(element.eventStart) : null,
      eventEnd: element.eventEnd ? new Date(element.eventEnd) : null,
      companyId: element.companyId,
      projectId: element.projectId,
      impact: element.impact,
      impactSource: 'llm',
      impactUpdatedAt: new Date(),
    };
  }
}
