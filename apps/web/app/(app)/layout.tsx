import { DataStreamProvider } from '@/components/data-stream-provider';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { ArtifactProvider } from '@/hooks/use-artifact';
import { ArtifactCanvas } from '@/components/artifact-canvas';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { DemoModeBannerWrapper } from '@/components/demo-mode-banner-wrapper';
import { DemoModeLayout } from '@/components/demo-mode-layout';
import { TourProvider } from '@/components/demo-tour';
import { PHProvider } from '@/components/posthog-provider';
import { auth } from '@/lib/better-auth/server';
import { getTopProjectsByImpact } from '@/database/projects/queries';
import { headers } from 'next/headers';
import { FeedbackWidget } from '@goodideadev/react';
import '@goodideadev/react/styles';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Derive isDemoMode from session
  const isDemoMode = (session?.user as any)?.level === 'demo';

  // Fetch top projects server-side (only for authenticated users)
  const topProjects = session?.user
    ? await getTopProjectsByImpact(session.user.id, 5).catch(() => [])
    : [];

  // Transform user object for AppSidebar component
  const sidebarUser = session?.user
    ? {
        id: session.user.id,
        name: session.user.name || undefined,
        email: session.user.email || undefined,
        image: session.user.image || undefined,
      }
    : undefined;

  return (
    <PHProvider user={sidebarUser}>
      <ArtifactProvider>
        <DataStreamProvider>
          <DemoModeLayout isDemoMode={isDemoMode}>
            <DemoModeBannerWrapper isDemoMode={isDemoMode} />
            <TourProvider>
              <SidebarProvider
                style={
                  {
                    '--sidebar-width': 'calc(var(--spacing) * 72)',
                    '--header-height': 'calc(var(--spacing) * 12)',
                  } as React.CSSProperties
                }
              >
                <AppSidebar
                  variant="inset"
                  user={sidebarUser}
                  isDemoMode={isDemoMode}
                  topProjects={topProjects}
                />
                {children}
                <FeedbackWidget
                  projectId="e16fdb14-7c88-4f49-a269-8fe124270a48"
                  position="bottom-right"
                  collectSentiment={true}
                  offerEmailFollowup={true}
                />
                <DataStreamHandler />
                <ArtifactCanvas />
              </SidebarProvider>
            </TourProvider>
          </DemoModeLayout>
        </DataStreamProvider>
      </ArtifactProvider>
    </PHProvider>
  );
}
