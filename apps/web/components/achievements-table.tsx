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
import type { Achievement } from '@/database/schema';

interface AchievementsTableProps {
  achievements: Achievement[];
  projects: Array<{ id: string; name: string; companyName: string | null }>;
  companies: Array<{ id: string; name: string }>;
  onImpactChange: (id: string, impact: number) => void;
  onSelectionChange: (selectedIds: string[]) => void;
  selectedAchievements: string[];
  onGenerateDocument: () => void; // Added onGenerateDocument prop
}

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
  onImpactChange,
  onSelectionChange,
  selectedAchievements,
  onGenerateDocument, // Added onGenerateDocument prop
}: AchievementsTableProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedProject, setSelectedProject] = React.useState<string>('all');
  const [selectedCompany, setSelectedCompany] = React.useState<string>('all');
  const [timePeriod, setTimePeriod] = React.useState<string>('all');
  const [displayCount, setDisplayCount] = React.useState(20);

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
          achievement.details?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Project filter
    if (selectedProject !== 'all') {
      filtered = filtered.filter(
        (achievement) => achievement.projectId === selectedProject
      );
    }

    // Company filter
    if (selectedCompany !== 'all') {
      filtered = filtered.filter(
        (achievement) => achievement.companyId === selectedCompany
      );
    }

    // Time period filter
    if (timePeriod !== 'all') {
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      filtered = filtered.filter((achievement) => {
        const createdAt = achievement.createdAt;

        switch (timePeriod) {
          case 'this-week':
            return createdAt >= startOfWeek;
          case 'this-month':
            return createdAt >= startOfMonth;
          case 'last-30-days':
            return createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          case 'last-month': {
            const lastMonth = new Date(
              now.getFullYear(),
              now.getMonth() - 1,
              1
            );
            const endOfLastMonth = new Date(
              now.getFullYear(),
              now.getMonth(),
              0
            );
            return createdAt >= lastMonth && createdAt <= endOfLastMonth;
          }
          case 'this-year':
            return createdAt >= startOfYear;
          case 'last-year': {
            const lastYear = new Date(now.getFullYear() - 1, 0, 1);
            const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
            return createdAt >= lastYear && createdAt <= endOfLastYear;
          }
          default:
            return true;
        }
      });
    }

    return filtered.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }, [achievements, searchTerm, selectedProject, selectedCompany, timePeriod]);

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
        selectedAchievements.filter((selectedId) => selectedId !== id)
      );
    }
  };

  const allDisplayedSelected =
    displayedAchievements.length > 0 &&
    displayedAchievements.every((achievement) =>
      selectedAchievements.includes(achievement.id)
    );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Recent Achievements</CardTitle>
            <CardDescription>
              Your latest accomplishments with impact ratings
            </CardDescription>
          </div>
          {selectedAchievements.length > 0 && (
            <Button onClick={onGenerateDocument}>
              <IconFileText className="size-4" />
              Generate Document ({selectedAchievements.length} selected)
            </Button>
          )}
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

          <Select value={selectedProject} onValueChange={setSelectedProject}>
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

          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
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

          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[150px]">
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
        <div className="overflow-hidden rounded-lg border">
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
                <TableHead>Date Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedAchievements.map((achievement) => (
                <TableRow key={achievement.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedAchievements.includes(achievement.id)}
                      onCheckedChange={(checked) =>
                        handleSelectAchievement(
                          achievement.id,
                          checked as boolean
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
                    {achievement.projectId ? (
                      <div className="flex items-center gap-2">
                        <IconFolder className="size-4 text-muted-foreground" />
                        <span className="text-sm">{achievement.projectId}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No project
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {achievement.companyId ? (
                      <div className="flex items-center gap-2">
                        <IconBuilding className="size-4 text-muted-foreground" />
                        <span className="text-sm">{achievement.companyId}</span>
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
                        {format(achievement.createdAt, 'MMM d, yyyy')}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
