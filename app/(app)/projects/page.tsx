// app/projects/page.tsx
import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import ProjectPage from './projectPage';

export const metadata: Metadata = {
  title: 'Projects - BragDoc.ai',
  description: 'Manage your projects and track achievements',
};

export default function ProjectsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Projects"
        description="Manage your projects and track achievements"
      />
      <ProjectPage />
    </div>
  );
}
