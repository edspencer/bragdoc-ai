'use client';

import * as React from 'react';
import {
  IconTarget,
  IconPlus,
  IconStarFilled,
  IconStar,
} from '@tabler/icons-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { WeeklyImpactChart } from '@/components/weekly-impact-chart';
import { AchievementsTable } from '@/components/achievements-table';
import { GenerateDocumentDialog } from '@/components/generate-document-dialog';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { useCompanies } from '@/hooks/use-companies';
import { useProjects } from '@/hooks/useProjects';
import { useAchievementMutations } from '@/hooks/use-achievement-mutations';
import { useAchievements } from '@/hooks/use-achievements';
import type { CreateAchievementRequest } from '@/lib/types/achievement';
import { AppPage } from '@/components/shared/app-page';

export default function AchievementsPage() {
  // Data fetching hooks
  const { companies } = useCompanies();
  const { projects } = useProjects();
  const { createAchievement, updateAchievement } = useAchievementMutations();
  const { achievements, mutate: mutateAchievements } = useAchievements();

  // Quick entry form state
  const [newAchievementText, setNewAchievementText] = React.useState('');
  const [selectedProjectId, setSelectedProjectId] =
    React.useState<string>('none');
  const [newAchievementImpact, setNewAchievementImpact] = React.useState(5);

  // Table state
  const [selectedAchievements, setSelectedAchievements] = React.useState<
    string[]
  >([]);
  const [generateDialogOpen, setGenerateDialogOpen] = React.useState(false);

  // Remember last selected project
  React.useEffect(() => {
    const lastProject = localStorage.getItem('lastSelectedProject');
    if (lastProject && projects?.find((p) => p.id === lastProject)) {
      setSelectedProjectId(lastProject);
    }
  }, [projects]);

  function StarRating({
    rating,
    onRatingChange,
  }: {
    rating: number;
    onRatingChange: (rating: number) => void;
  }) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <Button
            key={star}
            variant="ghost"
            size="icon"
            className="size-4 p-0 hover:bg-transparent"
            onClick={() => onRatingChange(star)}
          >
            {star <= rating ? (
              <IconStarFilled className="size-3 fill-yellow-400 text-yellow-400" />
            ) : (
              <IconStar className="size-3 text-muted-foreground hover:text-yellow-400" />
            )}
          </Button>
        ))}
      </div>
    );
  }

  const handleQuickAdd = async () => {
    if (!newAchievementText.trim()) {
      toast.error('Please enter an achievement description');
      return;
    }

    const actualProjectId =
      selectedProjectId === 'none' ? null : selectedProjectId;
    const selectedProject = actualProjectId
      ? projects?.find((p) => p.id === actualProjectId)
      : null;
    const selectedCompany = selectedProject?.company || null;

    const achievementData: CreateAchievementRequest = {
      title: newAchievementText.trim(),
      summary: null,
      details: null,
      projectId: actualProjectId || null,
      companyId: selectedCompany?.id || null,
      impact: newAchievementImpact,
      eventStart: new Date(),
      eventEnd: null,
      eventDuration: 'day',
      source: 'manual',
      userMessageId: null,
      isArchived: false,
      impactSource: 'user',
      impactUpdatedAt: new Date(),
    };

    try {
      await createAchievement(achievementData);
      setNewAchievementText('');
      setNewAchievementImpact(5);
      mutateAchievements(); // Refresh the achievements list

      // Remember the selected project
      if (actualProjectId) {
        localStorage.setItem('lastSelectedProject', actualProjectId);
      }
    } catch (error) {
      // Error toast is already handled in the hook
      console.error('Failed to create achievement:', error);
    }
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
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-6 p-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <IconTarget className="size-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">Achievements</h1>
                  <p className="text-muted-foreground text-sm">
                    Track your accomplishments and their impact
                  </p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Add Achievement</CardTitle>
                  <CardDescription>
                    Quickly log a new achievement
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Describe your achievement..."
                    value={newAchievementText}
                    onChange={(e) => setNewAchievementText(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex items-center gap-4">
                    <Select
                      value={selectedProjectId}
                      onValueChange={setSelectedProjectId}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No project</SelectItem>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Impact:
                      </span>
                      <StarRating
                        rating={newAchievementImpact}
                        onRatingChange={setNewAchievementImpact}
                      />
                      <span className="text-sm text-muted-foreground">
                        {newAchievementImpact}/10
                      </span>
                    </div>

                    <Button onClick={handleQuickAdd}>
                      <IconPlus className="size-4" />
                      Add Achievement
                    </Button>
                  </div>
                </CardContent>
              </Card>

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
            </div>
          </div>
        </div>
      </SidebarInset>

      <GenerateDocumentDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        selectedAchievements={achievements.filter((a) =>
          selectedAchievements.includes(a.id),
        )}
      />
    </AppPage>
  );
}
