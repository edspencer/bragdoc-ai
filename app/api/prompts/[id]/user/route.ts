export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { fetchRender as fetchRenderExtractAchievements } from '@/lib/ai/extract-achievements';
import { fetchRender as fetchRenderExtractCommitAchievements } from '@/lib/ai/extract-commit-achievements';

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

import { auth } from '@/app/(auth)/auth';

// This is a Server Route, so no "use client" here
export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  const { id } = await params;

  const session = await auth();

  if (!session) {
    return new NextResponse('Not logged in, try the /mock endpoint instead', { status: 401 });
  }

  const user = session.user;

  let input: any;
  let prompt: string =  '';

  switch (id) {
    case 'extract-achievements':
      prompt = await fetchRenderExtractAchievements({
        user: user as any,
        message: 'This is a test message',
        chatHistory: [
          {
            id: '1',
            role: 'user',
            content: 'This is a test message'
          }
        ]
      });
      break;
    case 'extract-commit-achievements':


      prompt = await fetchRenderExtractCommitAchievements({
        user: user as any,
        commits,
        repository
      });

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
