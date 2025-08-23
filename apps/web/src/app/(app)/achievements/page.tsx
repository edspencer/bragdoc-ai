import type { Metadata } from 'next';
import { AchievementsContent } from '@/components/achievements/AchievementsContent';
import { AppPage } from '@/components/shared/app-page';

export const metadata: Metadata = {
  title: 'Achievements | Bragdoc.ai',
  description: 'View and manage your professional achievements',
};

export default function AchievementsPage() {
  return (
    <AppPage title="Achievements" description="View and manage your professional achievements">
      <AchievementsContent />
    </AppPage>
  );
}
