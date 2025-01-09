import { NextResponse } from 'next/server';
import { z } from 'zod';
import { extractFromCommits } from '@/lib/ai/extractFromCommits';
import { db } from '@/lib/db';
import { RepositoryCommitHistory } from '@/types/commits';
import { getCompaniesByUserId, createAchievement, validateCLIToken } from '@/lib/db/queries';
import { getProjectsByUserId } from '@/lib/db/projects/queries';

// Validate request body
const requestSchema = z.object({
  repository: z.object({
    name: z.string(),
    path: z.string(),
  }),
  commits: z.array(z.object({
    hash: z.string(),
    message: z.string(),
    author: z.object({
      name: z.string(),
      email: z.string(),
    }),
    date: z.string(),
    prDetails: z.object({
      title: z.string(),
      description: z.string(),
      number: z.number(),
    }).optional(),
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

    const history: RepositoryCommitHistory = result.data;
    console.log(
      `Processing ${history.commits.length} commits from repository ${history.repository.name}`
    );

    // Get user's companies and projects for context
    const [companies, projects] = await Promise.all([
      getCompaniesByUserId({ userId }),
      getProjectsByUserId(userId),
    ]);

    // Extract achievements
    const achievements = [];
    for await (const achievement of extractFromCommits({
      commits: history.commits,
      repository: history.repository,
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
      achievements.push(savedAchievement);
    }

    return NextResponse.json({
      processedCount: history.commits.length,
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
