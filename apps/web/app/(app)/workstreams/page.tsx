import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { WorkstreamsZeroState } from '@/components/workstreams/workstreams-zero-state';
import { WorkstreamStats } from '@/components/workstreams/workstream-stats';
import { WorkstreamDateFilter } from '@/components/workstreams/workstream-date-filter';
import { WorkstreamsHeader } from '@/components/workstreams/workstreams-header';
import { AppPage } from '@/components/shared/app-page';
import { AppContent } from '@/components/shared/app-content';
import { GuidedTourButton } from '@/components/demo-tour';
import { WorkstreamsClient } from '@/components/workstreams/workstreams-client';
import { auth } from '@/lib/better-auth/server';
import {
  db,
  workstream,
  achievement,
  project,
  getWorkstreamMetadata,
} from '@bragdoc/database';
import { eq, and, gte, lte, count, inArray } from 'drizzle-orm';
import { subMonths, startOfDay, endOfDay } from 'date-fns';
import { headers } from 'next/headers';
import type { AchievementWithRelationsUI } from '@/lib/types/achievement';

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
  const datePreset = params.preset || '12m';
  const { startDate, endDate } = calculateDateRange(datePreset);

  // Fetch workstreams and metadata in parallel first
  const [userWorkstreams, metadata] = await Promise.all([
    db.select().from(workstream).where(eq(workstream.userId, userId)),
    getWorkstreamMetadata(userId),
  ]);

  // Get stored generation filters from metadata (if workstreams exist)
  const generationParams = metadata?.generationParams;
  const storedProjectIds = generationParams?.projectIds;
  const storedTimeRange = generationParams?.timeRange;

  // Build WHERE conditions for achievements query
  const achievementConditions = [eq(achievement.userId, userId)];

  // Apply stored project filter from generation params (if any)
  if (storedProjectIds && storedProjectIds.length > 0) {
    achievementConditions.push(
      inArray(achievement.projectId, storedProjectIds),
    );
  }

  // Apply stored time range from generation params, falling back to UI preset
  // Priority: stored time range > UI preset
  if (storedTimeRange?.startDate) {
    achievementConditions.push(
      gte(achievement.eventStart, new Date(storedTimeRange.startDate)),
    );
  } else if (startDate) {
    achievementConditions.push(gte(achievement.eventStart, startDate));
  }

  if (storedTimeRange?.endDate) {
    achievementConditions.push(
      lte(achievement.eventStart, new Date(storedTimeRange.endDate)),
    );
  } else if (endDate) {
    achievementConditions.push(lte(achievement.eventStart, endDate));
  }

  // Fetch filtered achievements with relations
  const achievementResults = await db
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
    .where(and(...achievementConditions));

  // Transform to AchievementWithRelationsUI type
  // Note: We're setting company and userMessage to null since we don't fetch them
  // We cast to any first to work around the type mismatch from partial selection
  const allAchievements: AchievementWithRelationsUI[] = achievementResults.map(
    (row) =>
      ({
        ...row,
        company: null,
        userMessage: null,
        // Handle nullable project from LEFT JOIN
        project: row.project?.id ? row.project : null,
      }) as AchievementWithRelationsUI,
  );

  const showZeroState = userWorkstreams.length === 0;

  // Calculate counts - data is already filtered by SQL, so just count directly
  const achievementCount = allAchievements.length;
  const unassignedCount = allAchievements.filter((a) => !a.workstreamId).length;

  // Calculate active workstream count - only workstreams that have achievements in the current date range
  // This matches what the Gantt chart displays
  const activeWorkstreamIds = new Set(
    allAchievements.filter((a) => a.workstreamId).map((a) => a.workstreamId),
  );
  const activeWorkstreamCount = activeWorkstreamIds.size;

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
            <>
              <WorkstreamsHeader
                showFilters={!showZeroState}
                storedProjectIds={storedProjectIds}
                storedTimeRange={storedTimeRange}
                workstreams={userWorkstreams}
                achievements={allAchievements}
                filterDisplay={
                  <>
                    {/* Show active filter info when stored generation params are applied */}
                    {(storedProjectIds || storedTimeRange) && (
                      <span className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Filtered:{' '}
                        </span>
                        {storedTimeRange && (
                          <span>
                            {new Date(
                              storedTimeRange.startDate,
                            ).toLocaleDateString()}{' '}
                            -{' '}
                            {new Date(
                              storedTimeRange.endDate,
                            ).toLocaleDateString()}
                          </span>
                        )}
                        {storedTimeRange && storedProjectIds && (
                          <span className="mx-1">•</span>
                        )}
                        {storedProjectIds && (
                          <span>
                            {storedProjectIds.length} project
                            {storedProjectIds.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </span>
                    )}
                    <WorkstreamDateFilter initialPreset={datePreset} />
                  </>
                }
              />
              <GuidedTourButton tourId="tour-workstreams" />
            </>
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
                workstreamCount={activeWorkstreamCount}
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
