'use client';

import * as React from 'react';
import {
  IconStar,
  IconStarFilled,
  IconBuilding,
  IconFolder,
  IconCalendar,
  IconSearch,
  IconFileText,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';
import { format } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AchievementItem } from '@/components/achievements/achievement-item';
import type { AchievementWithRelationsUI } from '@/lib/types/achievement';

interface AchievementsTableProps {
  achievements: AchievementWithRelationsUI[];
  projects: Array<{ id: string; name: string; companyName: string | null }>;
  companies: Array<{ id: string; name: string }>;
  workstreams?: Array<{ id: string; name: string; color: string }>;
  onImpactChange: (id: string, impact: number) => void;
  onSelectionChange: (selectedIds: string[]) => void;
  selectedAchievements: string[];
  onGenerateDocument: () => void; // Added onGenerateDocument prop
  projectId?: string; // Optional project ID to filter and hide project/company filters
  onEdit?: (achievement: AchievementWithRelationsUI) => void; // Added onEdit callback
  onDelete?: (achievement: AchievementWithRelationsUI) => void; // Added onDelete callback
}

function StarRating({
  rating,
  onRatingChange,
  id,
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
  id?: string;
}) {
  return (
    <div id={id} className="flex gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <Button
          key={star}
          variant="ghost"
          size="icon"
          className="size-4 p-0 hover:bg-transparent cursor-pointer"
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

const TIME_PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-30-days', label: 'Last 30 Days' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'this-year', label: 'This Year' },
  { value: 'last-year', label: 'Last Year' },
];

export function AchievementsTable({
  achievements,
  projects,
  companies,
  workstreams = [],
  onImpactChange,
  onSelectionChange,
  selectedAchievements,
  onGenerateDocument, // Added onGenerateDocument prop
  projectId, // Optional project ID to filter and hide project/company filters
  onEdit, // Added onEdit prop
  onDelete, // Added onDelete prop
}: AchievementsTableProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedProject, setSelectedProject] = React.useState<string>('all');
  const [selectedCompany, setSelectedCompany] = React.useState<string>('all');
  const [selectedWorkstream, setSelectedWorkstream] =
    React.useState<string>('all');
  const [timePeriod, setTimePeriod] = React.useState<string>('all');
  const [displayCount, setDisplayCount] = React.useState(20);

  // When projectId is provided, automatically set the project filter and hide UI filters
  const effectiveSelectedProject = projectId || selectedProject;

  // Filter achievements based on search and filters
  const filteredAchievements = React.useMemo(() => {
    let filtered = achievements;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (achievement) =>
          achievement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          achievement.summary
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          achievement.details?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Project filter
    if (effectiveSelectedProject !== 'all') {
      filtered = filtered.filter(
        (achievement) => achievement.project?.id === effectiveSelectedProject,
      );
    }

    // Company filter
    if (selectedCompany !== 'all') {
      filtered = filtered.filter(
        (achievement) => achievement.company?.id === selectedCompany,
      );
    }

    // Workstream filter
    if (selectedWorkstream !== 'all') {
      if (selectedWorkstream === 'unassigned') {
        filtered = filtered.filter((achievement) => !achievement.workstreamId);
      } else {
        filtered = filtered.filter(
          (achievement) => achievement.workstreamId === selectedWorkstream,
        );
      }
    }

    // Time period filter
    if (timePeriod !== 'all') {
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      filtered = filtered.filter((achievement) => {
        // Use eventStart if available, fall back to createdAt for legacy achievements without event dates
        const eventDate = achievement.eventStart ?? achievement.createdAt;

        switch (timePeriod) {
          case 'this-week':
            return eventDate >= startOfWeek;
          case 'this-month':
            return eventDate >= startOfMonth;
          case 'last-30-days':
            return eventDate >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          case 'last-month': {
            const lastMonth = new Date(
              now.getFullYear(),
              now.getMonth() - 1,
              1,
            );
            const endOfLastMonth = new Date(
              now.getFullYear(),
              now.getMonth(),
              0,
            );
            return eventDate >= lastMonth && eventDate <= endOfLastMonth;
          }
          case 'this-year':
            return eventDate >= startOfYear;
          case 'last-year': {
            const lastYear = new Date(now.getFullYear() - 1, 0, 1);
            const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
            return eventDate >= lastYear && eventDate <= endOfLastYear;
          }
          default:
            return true;
        }
      });
    }

    return filtered.sort((a, b) => {
      // Sort by eventStart (when achievement occurred), with createdAt as tiebreaker
      const aDate = a.eventStart?.getTime() ?? a.createdAt.getTime();
      const bDate = b.eventStart?.getTime() ?? b.createdAt.getTime();
      if (aDate !== bDate) {
        return bDate - aDate; // Sort by eventStart (most recent first)
      }
      return b.createdAt.getTime() - a.createdAt.getTime(); // Tiebreaker by createdAt
    });
  }, [
    achievements,
    searchTerm,
    effectiveSelectedProject,
    selectedCompany,
    selectedWorkstream,
    timePeriod,
  ]);

  const displayedAchievements = filteredAchievements.slice(0, displayCount);
  const hasMore = filteredAchievements.length > displayCount;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(displayedAchievements.map((a) => a.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectAchievement = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedAchievements, id]);
    } else {
      onSelectionChange(
        selectedAchievements.filter((selectedId) => selectedId !== id),
      );
    }
  };

  const allDisplayedSelected =
    displayedAchievements.length > 0 &&
    displayedAchievements.every((achievement) =>
      selectedAchievements.includes(achievement.id),
    );

  return (
    <Card id="tour-achievements-table">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Recent Achievements</CardTitle>
            <CardDescription>
              Your latest accomplishments with impact ratings
            </CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onGenerateDocument}
                disabled={selectedAchievements.length === 0}
                className="hidden md:flex"
              >
                <IconFileText className="size-4" />
                Generate Document
                {selectedAchievements.length > 0 &&
                  ` (${selectedAchievements.length} selected)`}
              </Button>
            </TooltipTrigger>
            {selectedAchievements.length === 0 && (
              <TooltipContent>
                Select at least one achievement to generate a document
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 pt-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search achievements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {!projectId && (
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="sm:w-[180px]">
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
          )}

          {!projectId && (
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="sm:w-[180px]">
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
          )}

          {workstreams.length > 0 && (
            <Select
              value={selectedWorkstream}
              onValueChange={setSelectedWorkstream}
            >
              <SelectTrigger className="sm:w-[180px]">
                <SelectValue placeholder="All Workstreams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workstreams</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {workstreams.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allDisplayedSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all achievements"
                  />
                </TableHead>
                <TableHead>Achievement</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Impact Rating</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedAchievements.map((achievement, index) => (
                <TableRow key={achievement.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedAchievements.includes(achievement.id)}
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
                      <Badge variant="secondary" className="w-fit text-xs">
                        {achievement.source}
                      </Badge>
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
                      <StarRating
                        rating={achievement.impact || 0}
                        onRatingChange={(rating) =>
                          onImpactChange(achievement.id, rating)
                        }
                        id={index === 0 ? 'tour-impact-rating' : undefined}
                      />
                      <span className="text-sm text-muted-foreground">
                        {achievement.impact}/10
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <IconCalendar className="size-4 text-muted-foreground" />
                      <span className="text-sm">
                        {achievement.eventStart
                          ? format(achievement.eventStart, 'MMM d, yyyy')
                          : format(achievement.createdAt, 'MMM d, yyyy')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(achievement)}
                          aria-label="Edit achievement"
                          className="h-8 w-8 p-0"
                        >
                          <IconEdit className="size-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(achievement)}
                          aria-label="Delete achievement"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <IconTrash className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden space-y-4">
          {displayedAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className="border-b border-border pb-4 last:border-b-0"
            >
              <AchievementItem
                achievement={achievement}
                onImpactChange={onImpactChange}
                onEdit={onEdit}
                onDelete={onDelete}
                readOnly={false}
                showSourceBadge={true}
                linkToAchievements={false}
              />
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => setDisplayCount((prev) => prev + 20)}
            >
              Load More ({filteredAchievements.length - displayCount} remaining)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
