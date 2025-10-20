import { auth } from 'app/(auth)/auth';
import { AppPage } from '@/components/shared/app-page';
import { SidebarInset } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site-header';

export const metadata = {
  title: 'Performance Review',
};

export default async function PerformancePage() {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return null;
  }

  return (
    <AppPage>
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md space-y-4">
              <h1 className="text-3xl font-bold">Performance Review</h1>
              <p className="text-muted-foreground">
                Coming soon: AI-powered performance review generation based on
                your achievements.
              </p>
              <p className="text-sm text-muted-foreground">
                This feature will help you compile your accomplishments into
                comprehensive performance review documents, highlighting your
                impact and growth.
              </p>
            </div>
          </div>
        </div>
      </SidebarInset>
    </AppPage>
  );
}
