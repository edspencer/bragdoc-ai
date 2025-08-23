export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { render as renderExtractAchievements } from '@/lib/ai/extract-achievements';
import { render as renderExtractCommitAchievements } from '@/lib/ai/extract-commit-achievements';
import { render as renderGenerateDocument } from '@/lib/ai/generate-document';

type Params = Promise<{
  id: string;
}>;

import {
  companies,
  projects,
  user,
  repository,
  commits,
} from '@/lib/ai/prompts/evals/data/user';

import { chatHistory, expectedAchievements as examples } from '@/lib/ai/prompts/evals/data/extract-achievements';
import { existingAchievements } from '@/lib/ai/prompts/evals/data/weekly-document-achievements';

// This is a Server Route, so no "use client" here
export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  const { id } = await params;

  let input: any;
  let prompt =  '';

  switch (id) {
    case 'extract-achievements':
      input = {
        user,
        message: 'Hello',
        chatHistory,
        projects,
        companies,
        examples
      }

      prompt = await renderExtractAchievements(input);
      break;
    case 'extract-commit-achievements':
      input = {
        user,
        companies,
        projects,
        repository,
        commits,
      }

      prompt = await renderExtractCommitAchievements(input);

      break;
    case 'generate-document':
      prompt = await renderGenerateDocument({
        user,
        docTitle: 'Weekly Update',
        days: 7,
        achievements: existingAchievements,
        project: projects[0],
        company: companies[0],
        userInstructions: 'Always use the title "Weekly Update"'
      });

      break;
  }

  // 4) Return the HTML as a text or HTML response
  return new NextResponse(prompt, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
