// app/projects/page.tsx
import type { Metadata } from 'next';

import ProjectPage from './projectPage';

export const metadata: Metadata = {
  title: 'Projects - BragDoc.ai',
  description: 'Manage your projects and track achievements',
};

export default function ProjectsPage() {
  return (
    <div className="p-6">
      <ProjectPage />
    </div>
  );
}