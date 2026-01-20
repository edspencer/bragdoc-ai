'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  Circle,
  Terminal,
  FlaskConical,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useGettingStarted,
  type ChecklistItem as ChecklistItemType,
} from '@/hooks/use-getting-started';
import { CompanyDialog } from '@/components/company-dialog';
import { ProjectDialog } from '@/components/project-dialog';
import { AchievementDialog } from '@/components/achievements/AchievementDialog';
import { CliInstructions } from '@/components/shared/cli-instructions';
import { useCreateCompany, useCompanies } from '@/hooks/use-companies';
import { useCreateProject, useProjects } from '@/hooks/useProjects';
import { useDemoMode } from '@/components/demo-mode-provider';
import type { Company } from '@/database/schema';

interface GettingStartedBannerProps {
  companiesCount: number;
  projectsCount: number;
  achievementsCount: number;
}

interface ChecklistItemProps {
  item: ChecklistItemType;
  onItemClick: (itemId: string) => void;
}

function ChecklistItem({ item, onItemClick }: ChecklistItemProps) {
  const handleClick = !item.isComplete ? () => onItemClick(item.id) : undefined;
  const handleKeyDown = !item.isComplete
    ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onItemClick(item.id);
        }
      }
    : undefined;

  return (
    <li
      className={cn(
        'flex items-center gap-2 text-sm',
        item.isComplete
          ? 'text-muted-foreground'
          : 'cursor-pointer hover:text-primary',
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={item.isComplete ? undefined : 0}
      role={item.isComplete ? undefined : 'button'}
    >
      {item.isComplete ? (
        <CheckCircle2 className="size-4 text-green-500" />
      ) : (
        <Circle className="size-4" />
      )}
      <span
        className={cn(item.isComplete ? 'line-through' : 'hover:underline')}
      >
        {item.label}
      </span>
    </li>
  );
}

export function GettingStartedBanner({
  companiesCount,
  projectsCount,
  achievementsCount,
}: GettingStartedBannerProps) {
  const { isDismissed, dismiss, checklistItems, completedCount, totalCount } =
    useGettingStarted({
      companiesCount,
      projectsCount,
      achievementsCount,
    });

  // Dialog state
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [achievementDialogOpen, setAchievementDialogOpen] = useState(false);
  const [cliDialogOpen, setCliDialogOpen] = useState(false);

  // Hooks for data and mutations
  const { companies } = useCompanies();
  const { projects } = useProjects();
  const createCompany = useCreateCompany();
  const createProject = useCreateProject();
  const { isLoading: isDemoLoading, toggleDemoMode } = useDemoMode();

  const handleChecklistItemClick = (itemId: string) => {
    switch (itemId) {
      case 'company':
        setCompanyDialogOpen(true);
        break;
      case 'project':
        setProjectDialogOpen(true);
        break;
      case 'achievement':
        setAchievementDialogOpen(true);
        break;
    }
  };

  const handleCompanySubmit = async (data: Omit<Company, 'id'>) => {
    await createCompany({
      name: data.name,
      domain: data.domain ?? undefined,
      role: data.role,
      startDate: data.startDate,
      endDate: data.endDate,
    });
  };

  const handleProjectSubmit = async (data: any) => {
    // Pass data directly - ProjectDialog already formats the data correctly
    await createProject(data);
  };

  // Don't render if dismissed
  if (isDismissed) {
    return null;
  }

  return (
    <div className="px-4 lg:px-6 pt-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Getting Started</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={dismiss}
          aria-label="Hide getting started guide"
        >
          Hide this
        </Button>
      </div>

      {/* Three cards in a grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Welcome Checklist */}
        <Card>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Welcome to BragDoc</h3>
              <p className="text-sm text-muted-foreground">
                Let&apos;s get your career documentation started
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {completedCount} of {totalCount} complete
            </div>
            <ul className="space-y-2">
              {checklistItems.map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  onItemClick={handleChecklistItemClick}
                />
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Card 2: CLI Setup */}
        <Card>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Terminal className="size-5" />
                Get Started with the CLI
              </h3>
              <p className="text-sm text-muted-foreground">
                Extract achievements automatically from Git
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => setCliDialogOpen(true)}
            >
              <span>Setup CLI Instructions</span>
              <ChevronRight className="size-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Try Demo Mode */}
        <Card className="flex flex-col">
          <CardContent className="space-y-4 flex-1">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FlaskConical className="size-5" />
                Try Demo Mode
              </h3>
              <p className="text-sm text-muted-foreground">
                Play with demo data without affecting your account
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter demo mode anytime to play with a pre-populated account. You
              can edit data, delete stuff, reset it, whatever you want, and then
              return to your own account any time.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              onClick={toggleDemoMode}
              disabled={isDemoLoading}
              className="gap-2"
            >
              {isDemoLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FlaskConical className="size-4" />
              )}
              Try Demo Mode
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Dialogs - rendered as portals */}
      <CompanyDialog
        open={companyDialogOpen}
        onOpenChange={setCompanyDialogOpen}
        onSubmit={handleCompanySubmit}
      />

      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        companies={companies ?? []}
        onSubmit={handleProjectSubmit}
        existingProjectCount={projects?.length ?? 0}
      />

      <AchievementDialog
        mode="create"
        open={achievementDialogOpen}
        onOpenChange={setAchievementDialogOpen}
      />

      {/* CLI Instructions Dialog */}
      <Dialog open={cliDialogOpen} onOpenChange={setCliDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>CLI Setup Instructions</DialogTitle>
            <DialogDescription>
              Follow these steps to install and configure the BragDoc CLI
            </DialogDescription>
          </DialogHeader>
          <CliInstructions />
        </DialogContent>
      </Dialog>
    </div>
  );
}
