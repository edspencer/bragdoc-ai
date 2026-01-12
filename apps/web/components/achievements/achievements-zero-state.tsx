'use client';

import { useState } from 'react';
import { IconTarget, IconPlus, IconTerminal2 } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageZeroState } from '@/components/shared/page-zero-state';
import { CliInstructions } from '@/components/shared/cli-instructions';

interface AchievementsZeroStateProps {
  onAddClick: () => void;
}

export function AchievementsZeroState({
  onAddClick,
}: AchievementsZeroStateProps) {
  const [cliDialogOpen, setCliDialogOpen] = useState(false);

  return (
    <>
      <PageZeroState
        icon={<IconTarget className="h-6 w-6 text-primary" />}
        title="Track Your Achievements"
      >
        <p className="text-muted-foreground text-center">
          While you can manually add achievements any time you like, it's much
          easier to use the bragdoc CLI to automatically extract them from your
          Git commits.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={onAddClick} size="lg" variant="outline">
            <IconPlus className="size-4 mr-2" />
            Add an Achievement
          </Button>
          <Button onClick={() => setCliDialogOpen(true)} size="lg">
            <IconTerminal2 className="size-4 mr-2" />
            Install bragdoc CLI
          </Button>
        </div>
      </PageZeroState>

      <Dialog open={cliDialogOpen} onOpenChange={setCliDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Install the bragdoc CLI</DialogTitle>
            <DialogDescription>
              The CLI automatically extracts achievements from your Git commits,
              saving you time and ensuring nothing gets missed.
            </DialogDescription>
          </DialogHeader>
          <CliInstructions />
        </DialogContent>
      </Dialog>
    </>
  );
}
