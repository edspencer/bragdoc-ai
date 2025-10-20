import type React from 'react';
import { notFound } from 'next/navigation';
import { auth } from 'app/(auth)/auth';
import { getProjectById } from '@bragdoc/database';

import { ProjectDetailsContent } from '@/components/project-details-content';
import { SidebarInset } from '@/components/ui/sidebar';
import { AppPage } from '@/components/shared/app-page';

interface ProjectDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailsPage({
  params,
}: ProjectDetailsPageProps) {
  const resolvedParams = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return <div>Please log in to view project details</div>;
  }

  const userId = session.user.id;
  const project = await getProjectById(resolvedParams.id, userId);

  if (!project) {
    notFound();
  }

  return (
    <AppPage>
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <ProjectDetailsContent project={project} />
          </div>
        </div>
      </SidebarInset>
    </AppPage>
  );
}
