import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from 'app/(auth)/auth';
import { db } from '@/database/index';
import { achievement, project, company } from '@/database/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId || userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get recent achievements with their associated project and company data
    const recentAchievements = await db
      .select({
        id: achievement.id,
        title: achievement.title,
        summary: achievement.summary,
        impact: achievement.impact,
        impactSource: achievement.impactSource,
        impactUpdatedAt: achievement.impactUpdatedAt,
        createdAt: achievement.createdAt,
        eventStart: achievement.eventStart,
        project: {
          id: project.id,
          name: project.name,
        },
        company: {
          id: company.id,
          name: company.name,
        },
      })
      .from(achievement)
      .leftJoin(project, eq(achievement.projectId, project.id))
      .leftJoin(company, eq(achievement.companyId, company.id))
      .where(
        eq(achievement.userId, userId) && eq(achievement.isArchived, false)
      )
      .orderBy(desc(achievement.createdAt))
      .limit(10);

    // Transform the data to match the expected interface
    const transformedData = recentAchievements.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      impact: item.impact || 2,
      impactSource: item.impactSource,
      impactUpdatedAt: item.impactUpdatedAt,
      createdAt: item.createdAt,
      eventStart: item.eventStart,
      project: item.project?.id ? item.project : undefined,
      company: item.company?.id ? item.company : undefined,
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error fetching recent achievements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
