import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';
import { AppPage } from 'components/shared/app-page';

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return null;
  }

  return (
    <AppPage
      title="Settings"
      description="Manage your account settings and preferences"
    >
      Setting coming soon
    </AppPage>
  );
}
