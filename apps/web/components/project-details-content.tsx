'use client';

import * as React from 'react';
import {
  IconBuilding,
  IconCalendar,
  IconTarget,
  IconTrendingUp,
} from '@tabler/icons-react';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { ProjectDialog } from '@/components/project-dialog';
import { WeeklyImpactChart } from '@/components/weekly-impact-chart';
import { AchievementsTable } from '@/components/achievements-table';
import { GenerateDocumentDialog } from '@/components/generate-document-dialog';
import { ProjectDetailsZeroState } from '@/components/project-details/project-zero-state';
import { Stat } from '@/components/shared/stat';
import { AchievementDialog } from '@/components/achievements/AchievementDialog';
import { DeleteAchievementDialog } from '@/components/achievements/delete-achievement-dialog';
import { useAchievements } from '@/hooks/use-achievements';
import { useCompanies } from '@/hooks/use-companies';
import { useUpdateProject } from '@/hooks/useProjects';
import { useAchievementMutations } from '@/hooks/use-achievement-mutations';
import { useAchievementActions } from '@/hooks/use-achievement-actions';
import type { ProjectWithCompany } from '@/database/projects/queries';

interface ProjectDetailsContentProps {
  project: ProjectWithCompany;
  editDialogOpen: boolean;
  onEditDialogChange: (open: boolean) => void;
  isDeleting: boolean;
  onHasAchievementsChange?: (hasAchievements: boolean) => void;
}

export function ProjectDetailsContent({
  project,
  editDialogOpen,
  onEditDialogChange,
  isDeleting,
  onHasAchievementsChange,
}: ProjectDetailsContentProps) {
  const [generateDialogOpen, setGenerateDialogOpen] = React.useState(false);
  const [selectedAchievements, setSelectedAchievements] = React.useState<
    string[]
  >([]);

  const { achievements, mutate: mutateAchievements } = useAchievements({
    limit: 1000,
  });
  const { companies } = useCompanies();
  const updateProject = useUpdateProject();
  const { updateAchievement } = useAchievementMutations();

  // Achievement edit/delete actions
  const {
    editDialogOpen: achievementEditDialogOpen,
    setEditDialogOpen: setAchievementEditDialogOpen,
    achievementToEdit,
    handleEditClick,
    handleEditSubmit,
    deleteDialogOpen: achievementDeleteDialogOpen,
    setDeleteDialogOpen: setAchievementDeleteDialogOpen,
    achievementToDelete,
    handleDeleteClick,
    handleDeleteConfirm,
    isDeletingAchievement,
  } = useAchievementActions({
    onRefresh: async () => {
      await mutateAchievements();
    },
  });

  // Filter achievements for this project
  const projectAchievements = React.useMemo(() => {
    return achievements.filter(
      (achievement) => achievement.project?.id === project.id,
    );
  }, [achievements, project.id]);

  // Notify parent of achievements state changes
  React.useEffect(() => {
    onHasAchievementsChange?.(projectAchievements.length > 0);
  }, [projectAchievements, onHasAchievementsChange]);

  // Calculate project stats
  const projectStats = React.useMemo(() => {
    const totalAchievements = projectAchievements.length;
    const totalImpactPoints = projectAchievements.reduce(
      (sum, achievement) => sum + (achievement.impact || 0),
      0,
    );
    const avgImpactPerAchievement =
      totalAchievements > 0
        ? Math.round((totalImpactPoints / totalAchievements) * 10) / 10
        : 0;

    // Calculate this week's impact
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeekAchievements = projectAchievements.filter(
      (achievement) =>
        achievement.eventStart &&
        new Date(achievement.eventStart) >= oneWeekAgo,
    );
    const thisWeekImpact = thisWeekAchievements.reduce(
      (sum, achievement) => sum + (achievement.impact || 0),
      0,
    );

    return {
      totalAchievements,
      totalImpactPoints,
      avgImpactPerAchievement,
      thisWeekImpact,
    };
  }, [projectAchievements]);

  const handleSubmitProject = async (data: any) => {
    try {
      await updateProject(project.id, data);
      onEditDialogChange(false);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleImpactChange = async (
    achievementId: string,
    newImpact: number,
  ) => {
    try {
      await updateAchievement(achievementId, {
        impact: newImpact,
        impactSource: 'user',
        impactUpdatedAt: new Date(),
      });
      mutateAchievements();
    } catch (error) {
      console.error('Failed to update impact:', error);
    }
  };

  const handleGenerateDocument = () => {
    if (selectedAchievements.length === 0) {
      return;
    }
    setGenerateDialogOpen(true);
  };

  // Get available projects and companies for the achievements table (excluding current project)
  const allProjects = React.useMemo(
    () =>
      achievements
        .filter((a) => a.project && a.project.id !== project.id)
        .map((a) => ({
          id: a.project!.id,
          name: a.project!.name,
          companyName: a.company?.name || null,
        }))
        .filter(
          (proj, index, self) =>
            self.findIndex((p) => p.id === proj.id) === index,
        ),
    [achievements, project.id],
  );

  const allCompanies = React.useMemo(
    () =>
      achievements
        .filter((a) => a.company)
        .map((a) => ({ id: a.company!.id, name: a.company!.name }))
        .filter(
          (comp, index, self) =>
            self.findIndex((c) => c.id === comp.id) === index,
        ),
    [achievements],
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      {isDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Deleting project...</p>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2 lg:gap-6">
        {/* Project Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <Badge className={getStatusColor(project.status)}>
              {project.status}
            </Badge>
          </div>
          {project.description && (
            <p className="text-muted-foreground max-w-2xl">
              {project.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {project.company && (
              <div className="flex items-center gap-2">
                <IconBuilding className="size-4" />
                <span>{project.company.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <IconCalendar className="size-4" />
              <span>
                {format(project.startDate, 'MMM yyyy')}
                {project.endDate && ` - ${format(project.endDate, 'MMM yyyy')}`}
              </span>
            </div>
          </div>
        </div>

        {/* Conditional: Zero state OR full content */}
        {projectAchievements.length === 0 ? (
          <ProjectDetailsZeroState projectName={project.name} />
        ) : (
          <>
            {/* Project Stats */}
            <div className="grid grid-cols-2 gap-2 lg:gap-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
              <Stat
                id="tour-project-achievements-stat"
                label="Project Achievements"
                value={projectStats.totalAchievements}
                badge={{
                  icon: <IconTarget className="size-3" />,
                  label: 'Total',
                }}
                footerHeading={{
                  text: 'Project contributions',
                  icon: <IconTarget className="size-4" />,
                }}
                footerDescription="All achievements for this project"
              />

              <Stat
                label="Total Impact Points"
                value={projectStats.totalImpactPoints}
                badge={{
                  icon: <IconTrendingUp className="size-3" />,
                  label: 'Project Total',
                }}
                footerHeading={{
                  text: 'Project impact score',
                  icon: <IconTrendingUp className="size-4" />,
                }}
                footerDescription={`Average ${projectStats.avgImpactPerAchievement} points per achievement`}
              />

              <Stat
                label="This Week's Impact"
                value={projectStats.thisWeekImpact}
                badge={{
                  icon: <IconTrendingUp className="size-3" />,
                  label: 'Week',
                }}
                footerHeading={{
                  text: 'Recent project activity',
                  icon: <IconTrendingUp className="size-4" />,
                }}
                footerDescription="Last 7 days"
              />

              <Stat
                label="Project Duration"
                value={
                  project.endDate
                    ? Math.ceil(
                        (project.endDate.getTime() -
                          project.startDate.getTime()) /
                          (1000 * 60 * 60 * 24 * 30),
                      )
                    : Math.ceil(
                        (Date.now() - project.startDate.getTime()) /
                          (1000 * 60 * 60 * 24 * 30),
                      )
                }
                badge={{
                  icon: <IconCalendar className="size-3" />,
                  label: 'Months',
                }}
                footerHeading={{
                  text:
                    project.status === 'active'
                      ? 'Ongoing project'
                      : 'Completed project',
                  icon: <IconCalendar className="size-4" />,
                }}
                footerDescription={
                  project.status === 'active'
                    ? 'Since start date'
                    : 'Total duration'
                }
              />
            </div>

            <div id="tour-project-impact-chart">
              <WeeklyImpactChart achievements={projectAchievements} />
            </div>

            <AchievementsTable
              achievements={projectAchievements}
              projects={allProjects}
              companies={allCompanies}
              onImpactChange={handleImpactChange}
              onSelectionChange={setSelectedAchievements}
              selectedAchievements={selectedAchievements}
              onGenerateDocument={handleGenerateDocument}
              projectId={project.id}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          </>
        )}
      </div>

      <ProjectDialog
        open={editDialogOpen}
        onOpenChange={onEditDialogChange}
        project={project}
        companies={companies || []}
        onSubmit={handleSubmitProject}
        existingProjectCount={0}
      />

      <GenerateDocumentDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        selectedAchievements={projectAchievements.filter((a) =>
          selectedAchievements.includes(a.id),
        )}
      />

      {/* Achievement Edit Dialog */}
      <AchievementDialog
        mode="edit"
        open={achievementEditDialogOpen}
        onOpenChange={setAchievementEditDialogOpen}
        achievement={achievementToEdit || undefined}
        onSubmit={handleEditSubmit}
      />

      {/* Achievement Delete Dialog */}
      <DeleteAchievementDialog
        open={achievementDeleteDialogOpen}
        onOpenChange={setAchievementDeleteDialogOpen}
        achievement={achievementToDelete}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeletingAchievement}
      />
    </>
  );
}
