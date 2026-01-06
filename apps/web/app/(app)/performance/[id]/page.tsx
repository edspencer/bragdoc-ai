import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';
import { AppPage } from 'components/shared/app-page';
import { SidebarInset } from '@/components/ui/sidebar';
import { PerformanceReviewEdit } from './performance-review-edit';

export default async function PerformanceReviewEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Await params (Next.js 16 async params)
  // Note: id parameter is available for future use when fetching real data
  const { id: _id } = await params;

  // Authenticate - return fallback UI if not authenticated (never use redirect())
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return <div className="p-4">Please log in.</div>;
  }

  return (
    <AppPage>
      <SidebarInset>
        <PerformanceReviewEdit />
      </SidebarInset>
    </AppPage>
  );
}
