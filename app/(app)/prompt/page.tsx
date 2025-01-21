import { Code } from 'bright';
import { ExtractAchievementsPrompt } from '@/lib/ai/prompts/extract-achievements';
import { ExtractCommitAchievementsPrompt } from '@/lib/ai/prompts/extract-commit-achievements';
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

export default function PromptPage() {
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
          <TabsTrigger value="extract-commits">
            Extract from Commits
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent
        value="extract-achievements"
        className="flex-1 overflow-y-auto container"
      >
        <PrettyPrompt>
          <ExtractAchievementsPrompt
            user={user as User}
            companies={companies}
            projects={projects}
            message="I got some cool stuff done today, I'm really proud of it"
            chatHistory={[
              {
                role: 'user',
                content:
                  "I got some cool stuff done today, I'm really proud of it",
                id: '1',
              },
              {
                role: 'assistant',
                content: "Thanks for the feedback, I'll keep working on it!",
                id: '2',
              },
            ]}
          />
        </PrettyPrompt>
      </TabsContent>
      <TabsContent
        value="extract-commits"
        className="flex-1 overflow-y-auto container"
      >
        <PrettyPrompt>
          <ExtractCommitAchievementsPrompt
            user={user as User}
            companies={companies}
            projects={projects}
            repository={repository}
            commits={commits}
          />
        </PrettyPrompt>
      </TabsContent>
    </Tabs>
  );
}
