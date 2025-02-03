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

import path from 'node:path';
import * as fs from 'node:fs';
import { AppPage } from '@/components/shared/app-page';
import Link from 'next/link';

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

  const description = (
    <>
      Previews of the various{' '}
      <Link
        className="decoration-dashed underline hover:decoration-solid"
        target="_blank"
        href="https://github.com/edspencer/mdx-prompt"
      >
        mdx-prompt
      </Link>{' '}
      driven prompts used in bragdoc.ai
    </>
  );

  return (
    <AppPage>
      <Tabs
        defaultValue="extract-achievements"
        className="w-full flex flex-col items-center gap-4 content-evenly"
      >
        <div className="flex gap-12 container">
          <PageHeader title="MDX Prompt Previews" description={description} />
          <TabsList>
            <TabsTrigger value="extract-achievements">
              Extract Achievements
            </TabsTrigger>
            <TabsTrigger value="extract-commit-achievements">
              Extract from Commits
            </TabsTrigger>
            <TabsTrigger value="generate-document">
              Generate Document
            </TabsTrigger>
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
    </AppPage>
  );
}
