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
            <DataStreamHandler />
            <ArtifactCanvas />
          </SidebarProvider>
        </DemoModeLayout>
      </DataStreamProvider>
    </ArtifactProvider>
  );
}
