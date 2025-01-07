// app/projects/page.tsx
import type { Metadata } from 'next';
import ProjectPage from './projectPage';
import { AppPage } from '@/components/shared/app-page';

export const metadata: Metadata = {
  title: 'Projects - BragDoc.ai',
  description: 'Manage your projects and track achievements',
};

export default function ProjectsPage() {
  return (
    <AppPage>
      <ProjectPage />
    </AppPage>
  );
}
