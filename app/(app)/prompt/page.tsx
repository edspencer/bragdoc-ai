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

import { PrettyPrompt } from './PrettyPrompt';

import { Components } from '@/lib/ai/mdx-prompt';

import path from 'node:path';
import * as fs from 'node:fs';

import MarkdownContent from '@/components/blog/MarkdownContent';

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
      </TabsContent>
      <TabsContent
        value="extract-commit-achievements"
        className="flex-1 overflow-y-auto container"
      >
        <PrettyPrompt id="extract-commit-achievements" />
      </TabsContent>
      <TabsContent
        value="generate-document"
        className="flex-1 overflow-y-auto container"
      >
        <PrettyPrompt id="generate-document" />
      </TabsContent>
    </Tabs>
  );
}
