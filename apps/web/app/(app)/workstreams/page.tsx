import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { WorkstreamsZeroState } from '@/components/workstreams/workstreams-zero-state';
import { WorkstreamStats } from '@/components/workstreams/workstream-stats';
import { WorkstreamDateFilter } from '@/components/workstreams/workstream-date-filter';
import { AppPage } from '@/components/shared/app-page';
import { AppContent } from '@/components/shared/app-content';
import { WorkstreamsClient } from '@/components/workstreams/workstreams-client';
import { auth } from '@/lib/better-auth/server';
import {
  db,
  workstream,
  achievement,
  company,
  project,
  userMessage,
} from '@bragdoc/database';
import { eq } from 'drizzle-orm';
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

  // Fetch workstreams and all achievements with relations in parallel
  const [userWorkstreams, achievementResults] = await Promise.all([
    db.select().from(workstream).where(eq(workstream.userId, userId)),
    db
      .select()
      .from(achievement)
      .leftJoin(company, eq(achievement.companyId, company.id))
      .leftJoin(project, eq(achievement.projectId, project.id))
      .leftJoin(userMessage, eq(achievement.userMessageId, userMessage.id))
      .where(eq(achievement.userId, userId)),
  ]);

  // Transform to AchievementWithRelations type
  const allAchievements: AchievementWithRelations[] = achievementResults.map(
    (row) => ({
      ...row.Achievement,
      company: row.Company,
      project: row.Project,
      userMessage: row.UserMessage,
    }),
  );

  const showZeroState = userWorkstreams.length === 0;

  // Calculate counts from the single achievement query
  let achievementCount = allAchievements.length;
  let unassignedCount = allAchievements.filter((a) => !a.workstreamId).length;
  let twelveMonthAchievementCount = 0;

  // Only calculate filtered counts if we have a date filter and workstreams exist
  if (!showZeroState && (startDate || endDate)) {
    achievementCount = allAchievements.filter((a) => {
      if (!a.eventStart) return false;
      const eventDate = new Date(a.eventStart);
      if (startDate && eventDate < startDate) return false;
      if (endDate && eventDate > endDate) return false;
      return true;
    }).length;

    unassignedCount = allAchievements.filter((a) => {
      if (a.workstreamId) return false;
      if (!a.eventStart) return false;
      const eventDate = new Date(a.eventStart);
      if (startDate && eventDate < startDate) return false;
      if (endDate && eventDate > endDate) return false;
      return true;
    }).length;
  }

  // Only calculate 12-month count if showing zero state
  if (showZeroState) {
    const twelveMonthsAgo = subMonths(new Date(), 12);
    twelveMonthAchievementCount = allAchievements.filter((a) => {
      if (!a.eventStart) return false;
      return new Date(a.eventStart) >= twelveMonthsAgo;
    }).length;
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
