import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';
import { AppPage } from 'components/shared/app-page';
import { SidebarInset } from '@/components/ui/sidebar';
import { PerformanceReviewEdit } from './performance-review-edit';
import {
  getPerformanceReviewById,
  getWorkstreamsByUserIdWithDateFilter,
} from '@bragdoc/database';

export default async function PerformanceReviewEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Await params (Next.js 16 async params)
  const { id } = await params;

  // Authenticate - return fallback UI if not authenticated (never use redirect())
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return <div className="p-4">Please log in.</div>;
  }

  // Fetch performance review by ID (scoped by userId for security)
  const performanceReview = await getPerformanceReviewById(id, session.user.id);

  // Return fallback UI if not found (never use redirect() - Cloudflare compatibility)
  if (!performanceReview) {
    return <div className="p-4">Performance review not found.</div>;
  }

  // Fetch workstreams for the performance review's date range
  const workstreams = await getWorkstreamsByUserIdWithDateFilter(
    session.user.id,
    performanceReview.startDate,
    performanceReview.endDate,
  );

  return (
    <AppPage>
      <SidebarInset>
        <PerformanceReviewEdit
          performanceReview={performanceReview}
          workstreams={workstreams}
        />
      </SidebarInset>
    </AppPage>
  );
}
