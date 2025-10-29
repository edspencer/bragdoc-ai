'use client';

import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { WeeklyImpactChart } from '@/components/weekly-impact-chart';
import { AchievementsTable } from '@/components/achievements-table';
import { GenerateDocumentDialog } from '@/components/generate-document-dialog';
import { QuickAddAchievementDialog } from '@/components/quick-add-achievement-dialog';
import { SidebarInset } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site-header';
import { useCompanies } from '@/hooks/use-companies';
import { useProjects } from '@/hooks/useProjects';
import { useAchievementMutations } from '@/hooks/use-achievement-mutations';
import { useAchievements } from '@/hooks/use-achievements';
import type { CreateAchievementRequest } from '@/lib/types/achievement';
import { AppPage } from '@/components/shared/app-page';
import { AppContent } from '@/components/shared/app-content';

export default function AchievementsPage() {
  // Data fetching hooks
  const { companies } = useCompanies();
  const { projects } = useProjects();
  const { createAchievement, updateAchievement } = useAchievementMutations();
  const { achievements, mutate: mutateAchievements } = useAchievements({
    limit: 1000,
  });

  // Dialog state
  const [quickAddDialogOpen, setQuickAddDialogOpen] = React.useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = React.useState(false);

  // Table state
  const [selectedAchievements, setSelectedAchievements] = React.useState<
    string[]
  >([]);

  const handleQuickAdd = async (data: {
    title: string;
    projectId: string | null;
    impact: number;
  }) => {
    const selectedProject = data.projectId
      ? projects?.find((p) => p.id === data.projectId)
      : null;
    const selectedCompany = selectedProject?.company || null;

    const achievementData: CreateAchievementRequest = {
      title: data.title.trim(),
      summary: null,
      details: null,
      projectId: data.projectId,
      companyId: selectedCompany?.id || null,
      impact: data.impact,
      eventStart: new Date(),
      eventEnd: null,
      eventDuration: 'day',
      source: 'manual',
      userMessageId: null,
      standupDocumentId: null,
      isArchived: false,
      impactSource: 'user',
      impactUpdatedAt: new Date(),
    };

    try {
      await createAchievement(achievementData);
      mutateAchievements(); // Refresh the achievements list
    } catch (error) {
      // Error toast is already handled in the hook
      console.error('Failed to create achievement:', error);
    }
  };

  const handleOpenQuickAdd = () => {
    setQuickAddDialogOpen(true);
  };

  const handleImpactChange = async (id: string, newImpact: number) => {
    try {
      await updateAchievement(id, {
        impact: newImpact,
        impactSource: 'user',
        impactUpdatedAt: new Date(),
      });
      mutateAchievements();
    } catch (error) {
      console.error('Failed to update impact:', error);
    }
  };

  const handleSelectionChange = (selectedIds: string[]) => {
    setSelectedAchievements(selectedIds);
  };

  const handleGenerateDocument = () => {
    if (selectedAchievements.length === 0) {
      toast.error('Please select at least one achievement');
      return;
    }
    setGenerateDialogOpen(true);
  };

  return (
    <AppPage>
      <SidebarInset>
        <SiteHeader title="Achievements">
          <Button onClick={handleOpenQuickAdd}>
            <IconPlus className="size-4" />
            <span className="hidden lg:inline">Quick Add</span>
          </Button>
        </SiteHeader>
        <AppContent>
          {/* Achievements Table */}
          <AchievementsTable
            achievements={achievements}
            projects={(projects || []).map((p) => ({
              id: p.id,
              name: p.name,
              companyName: p.company?.name || null,
            }))}
            companies={(companies || []).map((c) => ({
              id: c.id,
              name: c.name,
            }))}
            onImpactChange={handleImpactChange}
            onSelectionChange={handleSelectionChange}
            selectedAchievements={selectedAchievements}
            onGenerateDocument={handleGenerateDocument}
          />

          <WeeklyImpactChart achievements={achievements} />
        </AppContent>
      </SidebarInset>

      <GenerateDocumentDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        selectedAchievements={achievements.filter((a) =>
          selectedAchievements.includes(a.id),
        )}
      />
      <QuickAddAchievementDialog
        open={quickAddDialogOpen}
        onOpenChange={setQuickAddDialogOpen}
        projects={projects || []}
        onSubmit={handleQuickAdd}
      />
    </AppPage>
  );
}
