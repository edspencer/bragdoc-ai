'use client';

import Link from 'next/link';
import { IconFolder, IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { PageZeroState } from '@/components/shared/page-zero-state';

interface ProjectsZeroStateProps {
  onAddClick: () => void;
}

export function ProjectsZeroState({ onAddClick }: ProjectsZeroStateProps) {
  return (
    <PageZeroState
      icon={<IconFolder className="h-6 w-6 text-primary" />}
      title="No Projects Yet"
    >
      <p className="text-muted-foreground text-center">
        Most achievements are linked to a project. You can have any number of
        projects, and optionally link them to a{' '}
        <Link href="/companies" className="text-primary hover:underline">
          company
        </Link>{' '}
        to keep things organized.
      </p>
      <div className="text-center">
        <Button onClick={onAddClick} size="lg">
          <IconPlus className="size-4 mr-2" />
          Add Your First Project
        </Button>
      </div>
    </PageZeroState>
  );
}
