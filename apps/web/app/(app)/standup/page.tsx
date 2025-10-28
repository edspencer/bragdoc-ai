import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';
import { getStandupsByUserId } from '@bragdoc/database';
import { StandupZeroState } from 'components/standups/standup-zero-state';
import { ExistingStandupContent } from 'components/standups/existing-standup-content';
import { AppPage } from '@/components/shared/app-page';
import { SidebarInset } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site-header';

export const metadata = {
  title: 'Standup',
};

export default async function StandupPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user || !session.user.id) {
    return null;
  }

  const standups = await getStandupsByUserId(session.user.id);

  // For now, we only support one standup per user
  const standup = standups[0];

  return (
    <AppPage>
      <SidebarInset>
        <SiteHeader />
        {!standup ? (
          <StandupZeroState />
        ) : (
          <ExistingStandupContent standup={standup} />
        )}
      </SidebarInset>
    </AppPage>
  );
}
