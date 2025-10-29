import type React from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';
import { getProjectById } from '@bragdoc/database';

import { SidebarInset } from '@/components/ui/sidebar';
import { AppPage } from '@/components/shared/app-page';
import { ProjectDetailsWrapper } from './project-details-wrapper';

interface ProjectDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailsPage({
  params,
}: ProjectDetailsPageProps) {
  const resolvedParams = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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
        <ProjectDetailsWrapper project={project} />
      </SidebarInset>
    </AppPage>
  );
}
