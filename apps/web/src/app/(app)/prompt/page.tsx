import Link from 'next/link';
import { AppPage } from '@/components/shared/app-page';
import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PrettyPrompt } from './PrettyPrompt';

export default async function PromptPage() {
  const description = (
    <>
      Previews of the various{' '}
      <Link
        className="decoration-dotted underline hover:decoration-solid"
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
        <div className="flex gap-4 container items-center">
          <PageHeader title="MDX Prompt Previews" description={description} />
          <h2 className="flex-1 font-semibold text-right">Prompt:</h2>
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
