import { Code } from 'bright';
import { AppPage } from '@/components/shared/app-page';
import { ExtractAchievementsPrompt } from '@/lib/ai/prompts/extract-achievements';
import { ExtractCommitAchievementsPrompt } from '@/lib/ai/prompts/extract-commit-achievements';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    <AppPage>
      <Tabs defaultValue="extract-achievements" className="w-full">
        <TabsList>
          <TabsTrigger value="extract-achievements">
            Extract Achievements
          </TabsTrigger>
          <TabsTrigger value="extract-commits">
            Extract from Commits
          </TabsTrigger>
        </TabsList>
        <TabsContent value="extract-achievements">
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
        <TabsContent value="extract-commits">
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
    </AppPage>
  );
}
