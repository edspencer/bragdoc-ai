// app/projects/page.tsx
import type { Metadata } from 'next';
import { AppPage } from '@/components/shared/app-page';
import { ExtractAchievementsPrompt } from '@/lib/ai/prompts/extract-achievements';

import {
  previousCompany,
  company,
  project1,
  project2,
  user,
} from '@/evals/extract-achievements/dataset';

export default function PromptPage() {
  return (
    <AppPage>
      <ExtractAchievementsPrompt
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
    </AppPage>
  );
}
