'use client';

import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { WeeklyImpactChart } from '@/components/weekly-impact-chart';
import { AchievementsTable } from '@/components/achievements-table';
import { AchievementDialog } from '@/components/achievements/AchievementDialog';
import { DeleteAchievementDialog } from '@/components/achievements/delete-achievement-dialog';
import { GenerateDocumentDialog } from '@/components/generate-document-dialog';
import { QuickAddAchievementDialog } from '@/components/quick-add-achievement-dialog';
import { SidebarInset } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site-header';
import { useCompanies } from '@/hooks/use-companies';
import { useProjects } from '@/hooks/useProjects';
import { useAchievementMutations } from '@/hooks/use-achievement-mutations';
import { useAchievements } from '@/hooks/use-achievements';
import type {
  CreateAchievementRequest,
  AchievementWithRelations,
} from '@/lib/types/achievement';
import { AppPage } from '@/components/shared/app-page';
import { AppContent } from '@/components/shared/app-content';

export default function AchievementsPage() {
  // Data fetching hooks
  const router = useRouter();
  const { companies } = useCompanies();
  const { projects } = useProjects();
  const { createAchievement, updateAchievement } = useAchievementMutations();
  const { achievements, mutate: mutateAchievements } = useAchievements({
    limit: 1000,
  });

  // Dialog state
  const [quickAddDialogOpen, setQuickAddDialogOpen] = React.useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState<'create' | 'edit'>('create');
  const [selectedAchievementForEdit, setSelectedAchievementForEdit] =
    React.useState<AchievementWithRelations | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedAchievementForDelete, setSelectedAchievementForDelete] =
    React.useState<AchievementWithRelations | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

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

  const handleEditClick = (achievement: AchievementWithRelations) => {
    setSelectedAchievementForEdit(achievement);
    setEditMode('edit');
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (achievement: AchievementWithRelations) => {
    setSelectedAchievementForDelete(achievement);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAchievementForDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/achievements/${selectedAchievementForDelete.id}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      await mutateAchievements(); // Refresh the list
      setDeleteDialogOpen(false);
      setSelectedAchievementForDelete(null);
      toast.success('Achievement deleted successfully');
    } catch (error) {
      console.error('Error deleting achievement:', error);
      toast.error('Failed to delete achievement');
      throw error; // Re-throw for dialog to handle
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAchievementSubmit = async (data: any) => {
    try {
      if (editMode === 'create') {
        await createAchievement(data);
      } else if (editMode === 'edit' && selectedAchievementForEdit) {
        await updateAchievement(selectedAchievementForEdit.id, data);
      }
      mutateAchievements(); // Refresh the list
      setEditDialogOpen(false); // Close dialog
      setSelectedAchievementForEdit(null); // Reset selection
      setEditMode('create'); // Reset mode
    } catch (error) {
      // Error handling is already done in hooks (shows toast)
      console.error('Failed to save achievement:', error);
    }
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
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
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
      <AchievementDialog
        mode={editMode}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedAchievementForEdit(null);
            setEditMode('create');
          }
        }}
        achievement={selectedAchievementForEdit || undefined}
        onSubmit={handleAchievementSubmit}
      />
      <DeleteAchievementDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        achievement={selectedAchievementForDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
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
