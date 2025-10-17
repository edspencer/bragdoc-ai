import { auth } from 'app/(auth)/auth';
import { AppPage } from '@/components/shared/app-page';
import { SidebarInset } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site-header';

export const metadata = {
  title: 'Workstreams',
};

export default async function WorkstreamsPage() {
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
            <div className="text-center max-w-2xl space-y-4">
              <h1 className="text-3xl font-bold">Workstreams</h1>
              <p className="text-muted-foreground text-lg">
                Coming soon: Automatically discover thematic patterns in your
                work.
              </p>
              <div className="text-left space-y-3 text-sm text-muted-foreground">
                <p>
                  Workstreams will use AI to automatically group your
                  achievements into semantic categories that span multiple
                  projects:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    Discover patterns like &ldquo;API Performance
                    Optimization&rdquo; or &ldquo;User Authentication &
                    Security&rdquo;
                  </li>
                  <li>See how your work themes evolve over time</li>
                  <li>Group related achievements across different projects</li>
                  <li>Build a clearer picture of your areas of expertise</li>
                </ul>
                <p className="pt-2">
                  This feature will require at least 20 achievements to generate
                  meaningful workstreams.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </AppPage>
  );
}
