import { DataStreamProvider } from '@/components/data-stream-provider';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { ArtifactProvider } from '@/hooks/use-artifact';
import { ArtifactCanvas } from '@/components/artifact-canvas';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { DemoModeBannerWrapper } from '@/components/demo-mode-banner-wrapper';
import { DemoModeLayout } from '@/components/demo-mode-layout';
import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';
import { FeedbackWidget } from '@wishnova/react';
import '@wishnova/react/styles';

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

  return (
    <ArtifactProvider>
      <DataStreamProvider>
        <DemoModeLayout>
          <DemoModeBannerWrapper isDemoMode={isDemoMode} />
          <SidebarProvider
            style={
              {
                '--sidebar-width': 'calc(var(--spacing) * 72)',
                '--header-height': 'calc(var(--spacing) * 12)',
              } as React.CSSProperties
            }
          >
            <AppSidebar variant="inset" />
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
        </DemoModeLayout>
      </DataStreamProvider>
    </ArtifactProvider>
  );
}
