import { NextResponse } from 'next/server';
import { z } from 'zod';
import { extractFromCommits } from '@/lib/ai/extractFromCommits';
import { db } from '@/lib/db';
import { RepositoryCommitHistory } from '@/types/commits';
import { getCompaniesByUserId, createAchievement, validateCLIToken } from '@/lib/db/queries';
import { getProjectsByUserId, ensureProject } from '@/lib/db/projects/queries';

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

    // Get user's companies and projects for context
    const [companies, projects] = await Promise.all([
      getCompaniesByUserId({ userId }),
      getProjectsByUserId(userId),
    ]);

    console.log(
      `Processing ${result.data.commits.length} commits from repository ${repository.name}`
    );

    // Extract achievements
    const achievements = [];
    for await (const achievement of extractFromCommits({
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
      context: {
        companies: companies as any,
        projects: projects as any,
      },
    })) {
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
      achievements.push({
        id: savedAchievement.id,
        description: savedAchievement.summary || savedAchievement.title,
        date: savedAchievement.createdAt.toISOString(),
        source: {
          type: 'commit',
          hash: result.data.commits[0].hash,
        },
      });
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
