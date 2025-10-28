export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { fetchRender as fetchRenderExtractAchievements } from 'lib/ai/extract-achievements';
import { fetchRender as fetchRenderExtractCommitAchievements } from 'lib/ai/extract-commit-achievements';
import { getAuthUser } from '@/lib/getAuthUser';

type Params = Promise<{
  id: string;
}>;

import { repository, commits } from 'lib/ai/prompts/evals/data/user';

// This is a Server Route, so no "use client" here
export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = await params;

  const authResult = await getAuthUser(request);

  if (!authResult) {
    return new NextResponse('Not logged in, try the /mock endpoint instead', {
      status: 401,
    });
  }

  const user = authResult.user;

  let prompt = '';
  let status = 200;

  switch (id) {
    case 'extract-achievements':
      prompt = await fetchRenderExtractAchievements({
        user: user as any,
        message: 'This is a test message',
        chatHistory: [
          {
            id: '1',
            role: 'user',
            parts: [{ type: 'text', text: 'This is a test message' }],
          },
        ],
      });
      break;
    case 'extract-commit-achievements':
      prompt = await fetchRenderExtractCommitAchievements({
        user: user as any,
        commits,
        repository,
      });

      break;
    default:
      prompt = 'Invalid prompt ID';
      status = 404;
      break;
  }

  // 4) Return the HTML as a text or HTML response
  return new NextResponse(prompt, {
    status,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
