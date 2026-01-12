'use client';

import { IconBuilding, IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { PageZeroState } from '@/components/shared/page-zero-state';

interface CompaniesZeroStateProps {
  onAddClick: () => void;
}

export function CompaniesZeroState({ onAddClick }: CompaniesZeroStateProps) {
  return (
    <PageZeroState
      icon={<IconBuilding className="h-6 w-6 text-primary" />}
      title="No Companies Yet"
    >
      <p className="text-muted-foreground text-center">
        Companies help you organize your projects. Link multiple projects to a
        company, then use that company context when creating performance reviews
        or generating reports.
      </p>
      <div className="text-center">
        <Button onClick={onAddClick} size="lg">
          <IconPlus className="size-4 mr-2" />
          Add Your First Company
        </Button>
      </div>
    </PageZeroState>
  );
}
