'use client';

import * as React from 'react';
import {
  IconEdit,
  IconBuilding,
  IconCalendar,
  IconTarget,
  IconTrendingUp,
} from '@tabler/icons-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProjectDialog } from '@/components/project-dialog';
import { WeeklyImpactChart } from '@/components/weekly-impact-chart';
import { AchievementsTable } from '@/components/achievements-table';
import { GenerateDocumentDialog } from '@/components/generate-document-dialog';
import { useAchievements } from '@/hooks/use-achievements';
import { useCompanies } from '@/hooks/use-companies';
import { useUpdateProject } from '@/hooks/useProjects';
import { useAchievementMutations } from '@/hooks/use-achievement-mutations';
import type { ProjectWithCompany } from '@/database/projects/queries';

interface ProjectDetailsContentProps {
  project: ProjectWithCompany;
}

export function ProjectDetailsContent({ project }: ProjectDetailsContentProps) {
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = React.useState(false);
  const [selectedAchievements, setSelectedAchievements] = React.useState<
    string[]
  >([]);

  const { achievements, mutate: mutateAchievements } = useAchievements();
  const { companies } = useCompanies();
  const updateProject = useUpdateProject();
  const { updateAchievement } = useAchievementMutations();

  // Filter achievements for this project
  const projectAchievements = React.useMemo(() => {
    return achievements.filter(
      (achievement) => achievement.project?.id === project.id,
    );
  }, [achievements, project.id]);

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
      (achievement) => new Date(achievement.createdAt) >= oneWeekAgo,
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

  const handleEditProject = () => {
    setEditDialogOpen(true);
  };

  const handleSubmitProject = async (data: any) => {
    try {
      await updateProject(project.id, data);
      setEditDialogOpen(false);
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
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Project Header */}
        <div className="flex items-start justify-between px-4 lg:px-6">
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
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
                  {project.endDate &&
                    ` - ${format(project.endDate, 'MMM yyyy')}`}
                </span>
              </div>
            </div>
          </div>
          <Button onClick={handleEditProject}>
            <IconEdit className="size-4" />
            Edit Project
          </Button>
        </div>

        {/* Project Stats */}
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Project Achievements</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {projectStats.totalAchievements}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconTarget className="size-3" />
                  Total
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Project contributions <IconTarget className="size-4" />
              </div>
              <div className="text-muted-foreground">
                All achievements for this project
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Total Impact Points</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {projectStats.totalImpactPoints}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconTrendingUp className="size-3" />
                  Project Total
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Project impact score <IconTrendingUp className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Average {projectStats.avgImpactPerAchievement} points per
                achievement
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription>This Week&apos;s Impact</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {projectStats.thisWeekImpact}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconTrendingUp className="size-3" />
                  Week
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Recent project activity <IconTrendingUp className="size-4" />
              </div>
              <div className="text-muted-foreground">Last 7 days</div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Project Duration</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {project.endDate
                  ? Math.ceil(
                      (project.endDate.getTime() -
                        project.startDate.getTime()) /
                        (1000 * 60 * 60 * 24 * 30),
                    )
                  : Math.ceil(
                      (Date.now() - project.startDate.getTime()) /
                        (1000 * 60 * 60 * 24 * 30),
                    )}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <IconCalendar className="size-3" />
                  Months
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {project.status === 'active'
                  ? 'Ongoing project'
                  : 'Completed project'}{' '}
                <IconCalendar className="size-4" />
              </div>
              <div className="text-muted-foreground">
                {project.status === 'active'
                  ? 'Since start date'
                  : 'Total duration'}
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Weekly Impact Chart */}
        <div className="px-4 lg:px-6">
          <WeeklyImpactChart achievements={projectAchievements} />
        </div>

        {/* Achievements Table */}
        <div className="px-4 lg:px-6">
          <AchievementsTable
            achievements={projectAchievements}
            projects={allProjects}
            companies={allCompanies}
            onImpactChange={handleImpactChange}
            onSelectionChange={setSelectedAchievements}
            selectedAchievements={selectedAchievements}
            onGenerateDocument={handleGenerateDocument}
          />
        </div>
      </div>

      <ProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
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
    </>
  );
}
