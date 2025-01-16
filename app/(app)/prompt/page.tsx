import { AppPage } from '@/components/shared/app-page';
import { ExtractAchievementsPrompt } from '@/lib/ai/prompts/extract-achievements';
import { ExtractCommitAchievementsPrompt } from '@/lib/ai/prompts/extract-commit-achievements';

import {
  previousCompany,
  company,
  project1,
  project2,
  user,
} from '@/evals/extract-achievements/dataset';
import { User } from '@/lib/db/schema';

export default function PromptPage() {
  return (
    <AppPage>
      <ExtractAchievementsPrompt
        user={user as User}
        companies={[previousCompany, company]}
        projects={[project1, project2]}
        message="I got some cool stuff done today, I'm really proud of it"
        chatHistory={[
          {
            role: 'user',
            content: "I got some cool stuff done today, I'm really proud of it",
          },
          {
            role: 'assistant',
            content: "Thanks for the feedback, I'll keep working on it!",
          },
        ]}
      />
      <ExtractCommitAchievementsPrompt
        user={user as User}
        companies={[previousCompany, company]}
        projects={[project1, project2]}
        repository={{
          name: 'bragdoc-ai',
          path: '/path/to/bragdoc-ai',
          remoteUrl: 'https://github.com/edspencer/bragdoc-ai',
        }}
        commits={[
          {
            message: "I got some cool stuff done today, I'm really proud of it",
            hash: '1234',
            author: {
              name: 'John Doe',
              email: 'john@doe.com',
            },
            date: '2023-01-01',
          },
          {
            message: "Thanks for the feedback, I'll keep working on it!",
            hash: '5678',
            author: {
              name: 'John Doe',
              email: 'john@doe.com',
            },
            date: '2023-01-02',
          },
        ]}
      />
    </AppPage>
  );
}
