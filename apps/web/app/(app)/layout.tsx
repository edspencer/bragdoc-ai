import { DataStreamProvider } from '@/components/data-stream-provider';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { ArtifactProvider } from '@/hooks/use-artifact';
import { ArtifactCanvas } from '@/components/artifact-canvas';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import {
  CreditStatusProvider,
  type CreditStatus,
} from '@/components/credit-status';
import { DemoIntentHandler } from '@/components/demo-intent-handler';
import { DemoModeLayout } from '@/components/demo-mode-layout';
import { DemoModeProvider } from '@/components/demo-mode-provider';
import { PerUserDemoBanner } from '@/components/per-user-demo-banner';
import { TourProvider } from '@/components/demo-tour';
import { PHProvider } from '@/components/posthog-provider';
import { auth } from '@/lib/better-auth/server';
import { getFullSessionById } from '@/lib/demo-mode';
import { getTopProjectsByImpact } from '@/database/projects/queries';
import { getUserById } from '@bragdoc/database';
import { headers } from 'next/headers';
import { FeedbackWidget } from '@goodideadev/react';
import '@goodideadev/react/styles';

/**
 * Derive subscription type from user data for SSR hydration.
 */
function deriveSubscriptionType(
  user: { level: string | null; renewalPeriod: string | null } | null,
): CreditStatus['subscriptionType'] {
  if (!user) return 'free';
  if (user.level === 'demo') return 'demo';
  if (user.level === 'paid') {
    return user.renewalPeriod === 'lifetime' ? 'lifetime' : 'yearly';
  }
  return 'free';
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Check for per-user demo mode by querying session's impersonatedBy field
  // This indicates the user is viewing their shadow demo user's data
  let isPerUserDemoMode = false;
  if (session?.session?.id) {
    const fullSession = await getFullSessionById(session.session.id);
    isPerUserDemoMode = fullSession?.impersonatedBy != null;
  }

  // isDemoMode is now only per-user demo mode (standalone demo mode has been removed)
  const isDemoMode = isPerUserDemoMode;

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

  // Fetch full user data for credit status (SSR hydration)
  const user = session?.user?.id
    ? await getUserById(session.user.id)
    : undefined;

  // Derive initial credit status from user for SSR hydration
  const initialCreditStatus: CreditStatus | undefined = user
    ? {
        freeCredits: user.freeCredits ?? 10,
        freeChatMessages: user.freeChatMessages ?? 20,
        isUnlimited: user.level === 'paid' || user.level === 'demo',
        subscriptionType: deriveSubscriptionType(user),
        daysRemaining: undefined, // Simplified for initial load
      }
    : undefined;

  return (
    <PHProvider user={sidebarUser}>
      <ArtifactProvider>
        <DataStreamProvider>
          <DemoModeProvider initialDemoMode={isPerUserDemoMode}>
            <CreditStatusProvider initialStatus={initialCreditStatus}>
              <DemoIntentHandler isDemoMode={isPerUserDemoMode} />
              <DemoModeLayout isDemoMode={isDemoMode}>
                <PerUserDemoBanner />
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
            </CreditStatusProvider>
          </DemoModeProvider>
        </DataStreamProvider>
      </ArtifactProvider>
    </PHProvider>
  );
}
