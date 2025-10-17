import { DataStreamProvider } from '@/components/data-stream-provider';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { ArtifactProvider } from '@/hooks/use-artifact';
import { ArtifactCanvas } from '@/components/artifact-canvas';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { DemoModeBanner } from '@/components/demo-mode-banner';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ArtifactProvider>
      <DataStreamProvider>
        <DemoModeBanner />
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
      </DataStreamProvider>
    </ArtifactProvider>
  );
}
