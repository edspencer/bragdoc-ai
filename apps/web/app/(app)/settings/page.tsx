import { auth } from 'app/(auth)/auth';
import { AppPage } from 'components/shared/app-page';

export default async function SettingsPage() {
  const session = await auth();
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
