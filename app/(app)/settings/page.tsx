import { AppPage } from '@/components/shared/app-page';
import { Plan } from './Plan';

import { PageHeader } from '@/components/shared/page-header';

export default function SettingsPage() {
  return (
    <AppPage
      title="Settings"
      description="Manage your account settings and preferences"
    >
      <Plan />
    </AppPage>
  );
}
