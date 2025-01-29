export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { render as renderExtractAchievements } from '@/lib/ai/extract-achievements';

type Params = {
  id: string;
};

import {
  companies,
  projects,
  user,
  repository,
  commits,
} from '@/lib/ai/prompts/evals/data/user';
import { chatHistory } from '@/lib/ai/prompts/evals/data/extract-achievements';

// This is a Server Route, so no "use client" here
export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  const { id } = await params;

  let input: any;
  let prompt: string =  '';

  switch (id) {
    case 'extract-achievements':
      input = {
        user,
        message: 'Hello',
        chatHistory,
        projects,
        companies
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

      prompt = await renderExtractAchievements(input);

      break;
    default:

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
