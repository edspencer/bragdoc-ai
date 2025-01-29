import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAchievement, validateCLIToken, getUserById } from '@/lib/db/queries';
import { ensureProject } from '@/lib/db/projects/queries';
import { fetchRenderExecute } from '@/lib/ai/extract-commit-achievements';
import { User } from '@/lib/db/schema';

// Validate request body
const requestSchema = z.object({
  repository: z.object({
    remoteUrl: z.string(),
    currentBranch: z.string(),
    path: z.string(),
  }),
  commits: z.array(z.object({
    hash: z.string(),
    message: z.string(),
    author: z.string(),
    date: z.string(),
    branch: z.string(),
  })).max(100, 'Maximum 100 commits per request'),
});

export async function POST(req: Request) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    // Validate CLI token
    const { userId, isValid } = await validateCLIToken(token);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = requestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.format() },
        { status: 400 }
      );
    }

    const repository = {
      name: result.data.repository.remoteUrl.split('/').pop()?.replace(/\.git$/, '') || 'unknown',
      path: result.data.repository.path,
    };

    // Ensure we have a project for this repository
    const { projectId } = await ensureProject({
      userId,
      remoteUrl: result.data.repository.remoteUrl,
      repositoryName: repository.name,
    });

    console.log(
      `Processing ${result.data.commits.length} commits from repository ${repository.name}`
    );

    const user = await getUserById(userId);

    // Extract achievements
    const extracted = await fetchRenderExecute({
      commits: result.data.commits.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        author: {
          name: commit.author.split('<')[0].trim(),
          email: commit.author.match(/<(.+?)>/)?.[1] || '',
        },
        date: commit.date,
        prDetails: undefined,
      })),
      repository,
      user: user as User
    });

    const achievements = [];

    for await (const achievement of extracted) {
      const [savedAchievement] = await createAchievement({
        userId,
        title: achievement.title,
        summary: achievement.summary,
        details: achievement.details,
        eventDuration: achievement.eventDuration as any,
        eventStart: achievement.eventStart || null,
        eventEnd: achievement.eventEnd || null,
        companyId: achievement.companyId,
        projectId: achievement.projectId,
        source: 'llm',
        impact: achievement.impact,
        impactSource: 'llm',
      });

      // Format achievement for CLI response
      achievements.push(savedAchievement);
    }

    return NextResponse.json({
      processedCount: result.data.commits.length,
      achievements,
    });
  } catch (error) {
    console.error('Error processing commits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
