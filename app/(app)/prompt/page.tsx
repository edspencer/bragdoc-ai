import { Code } from 'bright';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { PageHeader } from '@/components/shared/page-header';

Code.theme = 'github-light';

import {
  companies,
  projects,
  user,
  repository,
  commits,
} from '@/lib/ai/prompts/evals/data/user';

import type { User } from '@/lib/db/schema';
import { PrettyPrompt } from './PrettyPrompt';
import { existingAchievements } from '@/lib/ai/prompts/evals/data/weekly-document-achievements';

import { Components } from '@/lib/ai/mdx-prompt';

import path from 'path';
import * as fs from 'fs';

import MarkdownContent from '@/components/blog/MarkdownContent';
import { PromptCode } from './PromptCode';

const mdxFilePath = path.resolve(
  './lib/ai/prompts/extract-commit-achievements.mdx'
);

export default async function PromptPage() {
  const prompt = fs.readFileSync(mdxFilePath, 'utf-8');

  const data = {
    user,
    repository,
    projects,
    commits,
    companies,
  };

  const previous = (
    <MarkdownContent content={prompt} components={Components} data={data} />
  );

  return (
    <Tabs
      defaultValue="extract-achievements"
      className="w-full flex flex-col h-svh items-center gap-8 content-evenly"
    >
      <div className="mt-8 flex gap-12 container px-4">
        <PageHeader title="JSX Prompt Previews" />
        <TabsList>
          <TabsTrigger value="extract-achievements">
            Extract Achievements
          </TabsTrigger>
          <TabsTrigger value="extract-commit-achievements">
            Extract from Commits
          </TabsTrigger>
          <TabsTrigger value="generate-document">Generate Document</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent
        value="extract-achievements"
        className="flex-1 overflow-y-auto container"
      >
        <PrettyPrompt id="extract-achievements" />
        {/* <PrettyPrompt>
          <ExtractAchievementsPrompt
          user={user as User}
          companies={companies}
          projects={projects}
          message="I fixed several UX bugs in the checkout flow on Bragdoc today"
          chatHistory={[
            {
              role: 'user',
              content:
              'I fixed several UX bugs in the checkout flow on Bragdoc today',
              id: '1',
              },
              {
                role: 'assistant',
                content: "Thanks for the feedback, I'll keep working on it!",
                id: '2',
                },
                ]}
                />
                </PrettyPrompt> */}
      </TabsContent>
      <TabsContent
        value="extract-commit-achievements"
        className="flex-1 overflow-y-auto container"
      >
        <PrettyPrompt id="extract-commit-achievements" />
        {/* <PrettyPrompt>
          <ExtractCommitAchievementsPrompt
            user={user as User}
            companies={companies}
            projects={projects}
            repository={repository}
            commits={commits}
          />
        </PrettyPrompt> */}
      </TabsContent>
      <TabsContent
        value="generate-document"
        className="flex-1 overflow-y-auto container"
      >
        <PrettyPrompt id="generate-document" />
        {/* <PrettyPrompt>
          <GenerateDocumentPrompt
            user={user as User}
            company={companies[0]}
            project={projects[0]}
            title="Weekly Summary"
            days={7}
            achievements={existingAchievements}
          />
        </PrettyPrompt> */}
      </TabsContent>
    </Tabs>
  );
}
