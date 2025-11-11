import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { WorkstreamsZeroState } from '@/components/workstreams/workstreams-zero-state';
import { WorkstreamStats } from '@/components/workstreams/workstream-stats';
import { WorkstreamDateFilter } from '@/components/workstreams/workstream-date-filter';
import { AppPage } from '@/components/shared/app-page';
import { AppContent } from '@/components/shared/app-content';
import { WorkstreamsClient } from '@/components/workstreams/workstreams-client';
import { auth } from '@/lib/better-auth/server';
import { db, workstream, achievement, project } from '@bragdoc/database';
import { eq, and, gte, lte, count } from 'drizzle-orm';
import { subMonths, startOfDay, endOfDay } from 'date-fns';
import { headers } from 'next/headers';
import type { AchievementWithRelations } from '@/lib/types/achievement';

/**
 * Convert preset string to absolute dates
 * @param preset - Preset string ('3m', '6m', '12m', '24m', or 'all')
 * @returns Object with startDate and endDate (undefined for 'all')
 */
function calculateDateRange(preset: string): {
  startDate: Date | undefined;
  endDate: Date | undefined;
} {
  const today = new Date();

  switch (preset) {
    case '3m': {
      const start = startOfDay(subMonths(today, 3));
      const end = endOfDay(today);
      return { startDate: start, endDate: end };
    }
    case '6m': {
      const start = startOfDay(subMonths(today, 6));
      const end = endOfDay(today);
      return { startDate: start, endDate: end };
    }
    case '12m': {
      const start = startOfDay(subMonths(today, 12));
      const end = endOfDay(today);
      return { startDate: start, endDate: end };
    }
    case '24m': {
      const start = startOfDay(subMonths(today, 24));
      const end = endOfDay(today);
      return { startDate: start, endDate: end };
    }
    case 'all':
    default:
      return { startDate: undefined, endDate: undefined };
  }
}

export default async function WorkstreamsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;
  const params = await searchParams;
  const datePreset = params.preset || '6m';
  const { startDate, endDate } = calculateDateRange(datePreset);

  // Build WHERE conditions for achievements query
  const achievementConditions = [eq(achievement.userId, userId)];

  // Add date filtering to SQL query instead of JavaScript
  if (startDate) {
    achievementConditions.push(gte(achievement.eventStart, startDate));
  }
  if (endDate) {
    achievementConditions.push(lte(achievement.eventStart, endDate));
  }

  // Fetch workstreams and filtered achievements with relations in parallel
  const [userWorkstreams, achievementResults] = await Promise.all([
    db.select().from(workstream).where(eq(workstream.userId, userId)),
    db
      .select({
        // Achievement fields - exclude heavy/unused fields
        id: achievement.id,
        workstreamId: achievement.workstreamId,
        title: achievement.title,
        summary: achievement.summary,
        eventStart: achievement.eventStart,
        createdAt: achievement.createdAt,
        impact: achievement.impact,
        impactSource: achievement.impactSource,
        // Excluded: userId, companyId, projectId, standupDocumentId, userMessageId,
        // details, eventEnd, eventDuration, isArchived, source, impactUpdatedAt,
        // updatedAt, workstreamSource, embedding (1536 dimensions!), embeddingModel,
        // embeddingGeneratedAt

        // Project fields - only what we need for display
        project: {
          id: project.id,
          name: project.name,
          color: project.color,
        },
      })
      .from(achievement)
      .leftJoin(project, eq(achievement.projectId, project.id))
      .where(and(...achievementConditions)),
  ]);

  // Transform to AchievementWithRelations type
  // Note: We're setting company and userMessage to null since we don't fetch them
  // We cast to any first to work around the type mismatch from partial selection
  const allAchievements: AchievementWithRelations[] = achievementResults.map(
    (row) =>
      ({
        ...row,
        company: null,
        userMessage: null,
        // Handle nullable project from LEFT JOIN
        project: row.project?.id ? row.project : null,
      }) as AchievementWithRelations,
  );

  const showZeroState = userWorkstreams.length === 0;

  // Calculate counts - data is already filtered by SQL, so just count directly
  const achievementCount = allAchievements.length;
  const unassignedCount = allAchievements.filter((a) => !a.workstreamId).length;

  // For zero state, fetch 12-month achievement count separately using SQL COUNT
  let twelveMonthAchievementCount = 0;
  if (showZeroState) {
    const twelveMonthsAgo = subMonths(new Date(), 12);
    const result = await db
      .select({ count: count() })
      .from(achievement)
      .where(
        and(
          eq(achievement.userId, userId),
          gte(achievement.eventStart, twelveMonthsAgo),
        ),
      );
    twelveMonthAchievementCount = result[0]?.count ?? 0;
  }

  return (
    <AppPage>
      <SidebarInset>
        <SiteHeader title="Workstreams">
          {!showZeroState && (
            <WorkstreamDateFilter initialPreset={datePreset} />
          )}
        </SiteHeader>
        <AppContent>
          {showZeroState ? (
            <WorkstreamsZeroState
              achievementCount={twelveMonthAchievementCount}
            />
          ) : (
            <div className="space-y-8">
              <WorkstreamStats
                workstreamCount={userWorkstreams.length}
                assignedCount={achievementCount - unassignedCount}
                unassignedCount={unassignedCount}
              />

              <WorkstreamsClient
                workstreams={userWorkstreams}
                achievements={allAchievements}
                initialPreset={datePreset}
              />
            </div>
          )}
        </AppContent>
      </SidebarInset>
    </AppPage>
  );
}
