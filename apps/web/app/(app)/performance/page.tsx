import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';
import { getPerformanceReviewsByUserId } from '@bragdoc/database';
import { AppPage } from '@/components/shared/app-page';
import { SidebarInset } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site-header';
import { AppContent } from '@/components/shared/app-content';
import { PerformanceReviewsTable } from '@/components/performance-review/performance-reviews-table';
import { PerformanceReviewActions } from '@/components/performance-review/performance-review-actions';

export const metadata = {
  title: 'Performance Reviews',
};

export default async function PerformanceReviewsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const reviews = await getPerformanceReviewsByUserId(session.user.id);

  return (
    <AppPage>
      <SidebarInset>
        <SiteHeader title="Performance Reviews">
          <PerformanceReviewActions />
        </SiteHeader>
        <AppContent>
          <PerformanceReviewsTable initialReviews={reviews} />
        </AppContent>
      </SidebarInset>
    </AppPage>
  );
}
