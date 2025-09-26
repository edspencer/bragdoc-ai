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
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { AchievementInsert, Achievement } from '@/lib/db/schema';

// Mock data - in real app this would come from your database
const mockProjects = [
  { id: '1', name: 'E-commerce Platform', companyName: 'Acme Corp' },
  { id: '2', name: 'Task Management App', companyName: 'TechStart Inc' },
  { id: '3', name: 'Personal Portfolio', companyName: null },
];

const mockCompanies = [
  { id: '1', name: 'Acme Corp' },
  { id: '2', name: 'TechStart Inc' },
  { id: '3', name: 'Innovation Labs' },
];

const mockAchievements: Achievement[] = [
  {
    id: '1',
    title: 'Implemented new authentication system',
    summary: 'Built secure OAuth integration with multi-factor authentication',
    details:
      'Designed and implemented a comprehensive authentication system using OAuth 2.0 with support for Google, GitHub, and email/password login. Added multi-factor authentication and session management.',
    projectId: '1',
    companyId: '1',
    impact: 8,
    eventStart: new Date('2024-01-15'),
    eventEnd: new Date('2024-01-20'),
    eventDuration: 'week' as const,
    source: 'manual' as const,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    isArchived: false,
    impactSource: 'llm' as const,
    impactUpdatedAt: new Date('2024-01-15'),
    userMessageId: '1',
    userId: '1',
  },
  {
    id: '2',
    title: 'Led team of 5 developers on mobile app redesign',
    summary:
      'Coordinated cross-functional team to deliver new mobile experience',
    details:
      'Led a team of 5 developers through a complete mobile app redesign, improving user engagement by 40% and reducing bounce rate by 25%. Managed sprint planning, code reviews, and stakeholder communication.',
    projectId: '2',
    companyId: '2',
    impact: 9,
    eventStart: new Date('2024-01-10'),
    eventEnd: new Date('2024-01-25'),
    eventDuration: 'month' as const,
    source: 'manual' as const,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12'),
    isArchived: false,
    impactSource: 'llm' as const,
    impactUpdatedAt: new Date('2024-01-12'),
    userMessageId: '2',
    userId: '2',
  },
  {
    id: '3',
    title: 'Reduced API response time by 40%',
    summary: 'Optimized database queries and implemented caching',
    details:
      'Identified performance bottlenecks in the API layer and implemented Redis caching, optimized database queries, and added connection pooling. Reduced average response time from 500ms to 300ms.',
    projectId: '1',
    companyId: '1',
    impact: 7,
    eventStart: new Date('2024-01-08'),
    eventEnd: new Date('2024-01-10'),
    eventDuration: 'day' as const,
    source: 'manual' as const,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    isArchived: false,
    impactSource: 'llm' as const,
    impactUpdatedAt: new Date('2024-01-10'),
    userMessageId: '3',
    userId: '3',
  },
];

export default function AchievementsPage() {
  const [achievements, setAchievements] = React.useState(mockAchievements);
  const [projects] = React.useState(mockProjects);
  const [companies] = React.useState(mockCompanies);

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
    if (lastProject && projects.find((p) => p.id === lastProject)) {
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

  const handleQuickAdd = () => {
    if (!newAchievementText.trim()) {
      toast.error('Please enter an achievement description');
      return;
    }

    const actualProjectId =
      selectedProjectId === 'none' ? null : selectedProjectId;
    const selectedProject = actualProjectId
      ? projects.find((p) => p.id === actualProjectId)
      : null;
    const selectedCompany = selectedProject
      ? companies.find((c) => c.name === selectedProject.companyName)
      : null;

    const newAchievement: Achievement = {
      id: Math.random().toString(36).substr(2, 9),
      title: newAchievementText.trim(),
      summary: null,
      details: null,
      projectId: actualProjectId,
      companyId: selectedCompany?.id || null,
      impact: newAchievementImpact,
      eventStart: new Date(),
      eventEnd: null,
      eventDuration: 'day',
      source: 'manual',
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      impactSource: 'llm',
      impactUpdatedAt: new Date(),
      userMessageId: '1',
      userId: '1',
    };

    setAchievements((prev) => [newAchievement, ...prev]);
    setNewAchievementText('');
    setNewAchievementImpact(5);

    // Remember the selected project
    if (actualProjectId) {
      localStorage.setItem('lastSelectedProject', actualProjectId);
    }

    toast.success('Achievement added successfully');
  };

  const handleImpactChange = (id: string, newImpact: number) => {
    setAchievements((prev) =>
      prev.map((achievement) =>
        achievement.id === id
          ? { ...achievement, impact: newImpact }
          : achievement
      )
    );
    toast.success('Impact rating updated');
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
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
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
                        {projects.map((project) => (
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
                projects={projects}
                companies={companies}
                onImpactChange={handleImpactChange}
                onSelectionChange={handleSelectionChange}
                selectedAchievements={selectedAchievements}
                onGenerateDocument={handleGenerateDocument}
              />

              <WeeklyImpactChart />
            </div>
          </div>
        </div>
      </SidebarInset>

      <GenerateDocumentDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        selectedAchievements={achievements.filter((a) =>
          selectedAchievements.includes(a.id)
        )}
      />
    </SidebarProvider>
  );
}
