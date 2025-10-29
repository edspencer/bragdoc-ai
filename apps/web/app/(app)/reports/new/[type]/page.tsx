'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  IconUserCheck,
  IconArrowLeft,
  IconSparkles,
  IconStar,
  IconStarFilled,
  IconBuilding,
  IconFolder,
  IconLoader2,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { useSession } from '@/lib/better-auth/client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SidebarInset } from '@/components/ui/sidebar';
import { AppPage } from 'components/shared/app-page';
import { AppContent } from '@/components/shared/app-content';
import Link from 'next/link';

interface Achievement {
  id: string;
  title: string;
  summary: string | null;
  projectId: string | null;
  project: {
    id: string;
    name: string;
    color: string;
  } | null;
  companyId: string | null;
  company: {
    id: string;
    name: string;
  } | null;
  impact: number;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  companyId: string | null;
}

interface Company {
  id: string;
  name: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <div key={star}>
          {star <= rating ? (
            <IconStarFilled className="size-3 fill-yellow-400 text-yellow-400" />
          ) : (
            <IconStar className="size-3 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  );
}

const DEFAULT_INSTRUCTIONS = {
  weekly: `Please write a concise weekly report for my manager summarizing the following achievements from this week. Focus on:
- Key accomplishments and their business impact
- Progress on ongoing projects
- Any blockers or challenges faced
- Plans for next week

Keep it professional and highlight measurable results where possible.`,
  monthly: `Please write a comprehensive monthly report for my manager summarizing the following achievements from this month. Include:
- Major accomplishments and milestones reached
- Impact on team and company goals
- Key metrics and improvements
- Challenges overcome
- Goals for next month

Use a professional tone and emphasize strategic contributions.`,
  custom: `Please write a report based on the following achievements:`,
};

function getDefaultInstructionsForType(type: string): string {
  return (
    DEFAULT_INSTRUCTIONS[type as keyof typeof DEFAULT_INSTRUCTIONS] ||
    DEFAULT_INSTRUCTIONS.custom
  );
}

function getDateRangeForType(type: string): Date {
  switch (type) {
    case 'weekly':
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(0); // All time for custom
  }
}

function getTitleForType(type: string): string {
  const titleMap: Record<string, string> = {
    weekly: 'Weekly Report',
    monthly: 'Monthly Report',
    custom: 'Custom Report',
  };
  return titleMap[type] || 'New Report';
}

export default function NewReportPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const { data: session } = useSession();

  const [achievements, setAchievements] = React.useState<Achievement[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // User instructions - start with saved preference or default
  const defaultInstructions = getDefaultInstructionsForType(type);
  // Type cast to access custom Better Auth fields (preferences is an additionalField in config)
  const savedInstructions = (
    session?.user as { preferences?: { documentInstructions?: string } }
  )?.preferences?.documentInstructions;
  const [userInstructions, setUserInstructions] = React.useState(
    savedInstructions || defaultInstructions,
  );

  // Update instructions when session loads or type changes
  React.useEffect(() => {
    const instructions = savedInstructions || defaultInstructions;
    setUserInstructions(instructions);
  }, [savedInstructions, defaultInstructions]);

  // Filters
  const [selectedProject, setSelectedProject] = React.useState<string>('all');
  const [selectedCompany, setSelectedCompany] = React.useState<string>('all');

  // Selection - all selected by default
  const [selectedAchievements, setSelectedAchievements] = React.useState<
    string[]
  >([]);

  // Fetch data on mount
  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const dateThreshold = getDateRangeForType(type);
        const now = new Date();

        // Fetch achievements, projects, and companies in parallel
        const [achievementsRes, projectsRes, companiesRes] = await Promise.all([
          fetch(
            `/api/achievements?startDate=${dateThreshold.toISOString()}&endDate=${now.toISOString()}&limit=200`,
          ),
          fetch('/api/projects'),
          fetch('/api/companies'),
        ]);

        const achievementsData = await achievementsRes.json();
        const projectsData = await projectsRes.json();
        const companiesData = await companiesRes.json();

        setAchievements(achievementsData.achievements || []);
        setProjects(projectsData || []); // API returns array directly
        setCompanies(companiesData || []); // API returns array directly

        // Select all achievements by default
        setSelectedAchievements(
          (achievementsData.achievements || []).map((a: Achievement) => a.id),
        );
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [type]);

  // Filter achievements by filters
  const filteredAchievements = React.useMemo(() => {
    let filtered = achievements;

    // Project filter
    if (selectedProject !== 'all') {
      filtered = filtered.filter((a) => a.projectId === selectedProject);
    }

    // Company filter
    if (selectedCompany !== 'all') {
      filtered = filtered.filter((a) => a.companyId === selectedCompany);
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [achievements, selectedProject, selectedCompany]);

  // Update selection when filtered achievements change
  React.useEffect(() => {
    setSelectedAchievements(filteredAchievements.map((a) => a.id));
  }, [filteredAchievements]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAchievements(filteredAchievements.map((a) => a.id));
    } else {
      setSelectedAchievements([]);
    }
  };

  const handleSelectAchievement = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedAchievements((prev) => [...prev, id]);
    } else {
      setSelectedAchievements((prev) =>
        prev.filter((selectedId) => selectedId !== id),
      );
    }
  };

  const allSelected =
    filteredAchievements.length > 0 &&
    filteredAchievements.every((achievement) =>
      selectedAchievements.includes(achievement.id),
    );

  const handleGenerate = async () => {
    if (selectedAchievements.length === 0) {
      toast.error('Please select at least one achievement');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          achievementIds: selectedAchievements,
          type: `${type}_report`, // weekly -> weekly_report
          title: getTitleForType(type),
          userInstructions,
          defaultInstructions,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      toast.success('Document generated successfully');
      router.push('/reports');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AppPage>
      <SidebarInset>
        <AppContent>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/reports">
                  <IconArrowLeft className="size-5" />
                </Link>
              </Button>
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <IconUserCheck className="size-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">
                  {getTitleForType(type)}
                </h1>
                <p className="text-muted-foreground text-sm">
                  Customize instructions and select achievements for your report
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Instructions Editor */}
              <Card>
                <CardHeader>
                  <CardTitle>Generation Instructions</CardTitle>
                  <CardDescription>
                    Customize how the AI should write your report. Changes will
                    be saved for future reports.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={userInstructions}
                    onChange={(e) => setUserInstructions(e.target.value)}
                    className="min-h-[120px]"
                    placeholder="Enter instructions for the AI..."
                  />
                </CardContent>
              </Card>

              {/* Achievements Selection */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Select Achievements</CardTitle>
                      <CardDescription>
                        Choose which achievements to include in your report (
                        {selectedAchievements.length} selected)
                      </CardDescription>
                    </div>
                    <Button
                      onClick={handleGenerate}
                      disabled={
                        isGenerating || selectedAchievements.length === 0
                      }
                    >
                      {isGenerating ? (
                        <>
                          <IconLoader2 className="size-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <IconSparkles className="size-4" />
                          Generate Report
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap gap-4 pt-4">
                    <Select
                      value={selectedProject}
                      onValueChange={setSelectedProject}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Projects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedCompany}
                      onValueChange={setSelectedCompany}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Companies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Companies</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader className="bg-muted">
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={handleSelectAll}
                              aria-label="Select all achievements"
                            />
                          </TableHead>
                          <TableHead>Achievement</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Impact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAchievements.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center text-muted-foreground py-8"
                            >
                              No achievements found for this time period
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAchievements.map((achievement) => (
                            <TableRow key={achievement.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedAchievements.includes(
                                    achievement.id,
                                  )}
                                  onCheckedChange={(checked) =>
                                    handleSelectAchievement(
                                      achievement.id,
                                      checked as boolean,
                                    )
                                  }
                                  aria-label={`Select ${achievement.title}`}
                                />
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <div className="flex flex-col gap-1">
                                  <div className="font-medium line-clamp-2">
                                    {achievement.title}
                                  </div>
                                  {achievement.summary && (
                                    <div className="text-sm text-muted-foreground line-clamp-1">
                                      {achievement.summary}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {achievement.project ? (
                                  <div className="flex items-center gap-2">
                                    <IconFolder className="size-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      {achievement.project.name}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    No project
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {achievement.company ? (
                                  <div className="flex items-center gap-2">
                                    <IconBuilding className="size-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      {achievement.company.name}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    No company
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <StarRating rating={achievement.impact} />
                                  <span className="text-sm text-muted-foreground">
                                    {achievement.impact}/10
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </AppContent>
      </SidebarInset>
    </AppPage>
  );
}
