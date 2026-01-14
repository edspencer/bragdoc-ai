'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, Loader2 } from 'lucide-react';
import { PageZeroState } from '@/components/shared/page-zero-state';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useWorkstreamsActions } from '@/hooks/use-workstreams';
import { useProjects } from '@/hooks/useProjects';
import { useRouter } from 'next/navigation';

interface WorkstreamsZeroStateProps {
  achievementCount: number;
}

const timePresets = [
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: '18m', label: 'Last 18 months' },
  { value: '24m', label: 'Last 24 months' },
];

function getDateRangeFromPreset(preset: string): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = new Date();
  const startDate = new Date();

  const months = Number.parseInt(preset.replace('m', ''), 10);
  startDate.setMonth(startDate.getMonth() - months);

  return { startDate, endDate };
}

export function WorkstreamsZeroState({
  achievementCount: initialAchievementCount,
}: WorkstreamsZeroStateProps) {
  const router = useRouter();
  const [noWorkstreamsFound, setNoWorkstreamsFound] = useState(false);
  const [timePreset, setTimePreset] = useState('12m');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  const { projects, isLoading: projectsLoading } = useProjects();

  // Use filtered count if available, otherwise fall back to initial count
  const achievementCount = filteredCount ?? initialAchievementCount;
  const canGenerate = achievementCount >= 20;

  // Fetch filtered achievement count when filters change
  const fetchFilteredCount = useCallback(async () => {
    setIsLoadingCount(true);
    try {
      const { startDate, endDate } = getDateRangeFromPreset(timePreset);
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Only include projectIds if some (but not all) are selected
      if (
        selectedProjectIds.length > 0 &&
        selectedProjectIds.length < projects.length
      ) {
        params.set('projectIds', selectedProjectIds.join(','));
      }

      const response = await fetch(
        `/api/achievements/count?${params.toString()}`,
      );
      if (response.ok) {
        const data = await response.json();
        setFilteredCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch filtered count:', error);
    } finally {
      setIsLoadingCount(false);
    }
  }, [timePreset, selectedProjectIds, projects.length]);

  // Fetch count when filters change (debounced via effect)
  useEffect(() => {
    // Don't fetch until projects are loaded
    if (projectsLoading) return;

    fetchFilteredCount();
  }, [fetchFilteredCount, projectsLoading]);

  // Use the hook for generation capabilities only (no data fetching needed)
  const { generateWorkstreams, isGenerating, generationStatus } =
    useWorkstreamsActions();

  // Sort projects alphabetically
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);

  const handleProjectToggle = (projectId: string, checked: boolean) => {
    if (checked) {
      setSelectedProjectIds((prev) => [...prev, projectId]);
    } else {
      setSelectedProjectIds((prev) => prev.filter((id) => id !== projectId));
    }
  };

  const handleSelectAll = () => {
    if (selectedProjectIds.length === projects.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(projects.map((p) => p.id));
    }
  };

  const handleGenerate = async () => {
    setNoWorkstreamsFound(false);
    try {
      // Build filters from form state
      const { startDate, endDate } = getDateRangeFromPreset(timePreset);
      const filters: {
        timeRange?: { startDate: string; endDate: string };
        projectIds?: string[];
      } = {
        timeRange: {
          startDate: startDate.toISOString().split('T')[0] as string,
          endDate: endDate.toISOString().split('T')[0] as string,
        },
      };

      // Only include projectIds if some (but not all) are selected
      if (
        selectedProjectIds.length > 0 &&
        selectedProjectIds.length < projects.length
      ) {
        filters.projectIds = selectedProjectIds;
      }

      const result = await generateWorkstreams(filters);
      // Check if clustering found no workstreams (full clustering only)
      if (
        result &&
        result.strategy === 'full' &&
        result.workstreamsCreated === 0 &&
        result.outliers > 0
      ) {
        setNoWorkstreamsFound(true);
      } else {
        // Refresh the page to show the new workstreams
        router.refresh();
        // Scroll to top so user sees the Gantt chart from the beginning
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    } catch (error) {
      console.error('Failed to generate workstreams:', error);
    }
  };

  return (
    <PageZeroState
      icon={<TrendingUp className="h-6 w-6 text-primary" />}
      title="Discover Your Workstreams"
    >
      <p className="text-muted-foreground text-center">
        Workstreams automatically group related achievements across projects,
        helping you identify patterns and themes in your work.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Generation Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Time Range Selection */}
          <div className="space-y-2">
            <Label htmlFor="time-range">Time Range</Label>
            <Select value={timePreset} onValueChange={setTimePreset}>
              <SelectTrigger id="time-range" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timePresets.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only achievements within this time range will be used for
              clustering
            </p>
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Projects</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-auto py-1 px-2 text-xs"
              >
                {selectedProjectIds.length === projects.length
                  ? 'Deselect all'
                  : 'Select all'}
              </Button>
            </div>
            {projectsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading projects...
              </div>
            ) : projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects found</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {sortedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
                    onClick={() =>
                      handleProjectToggle(
                        project.id,
                        !selectedProjectIds.includes(project.id),
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleProjectToggle(
                          project.id,
                          !selectedProjectIds.includes(project.id),
                        );
                      }
                    }}
                    tabIndex={0}
                    role="checkbox"
                    aria-checked={selectedProjectIds.includes(project.id)}
                  >
                    <Checkbox
                      checked={selectedProjectIds.includes(project.id)}
                      onCheckedChange={(checked) =>
                        handleProjectToggle(project.id, checked === true)
                      }
                      tabIndex={-1}
                    />
                    <span className="text-sm truncate" title={project.name}>
                      {project.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {selectedProjectIds.length === 0 ||
              selectedProjectIds.length === projects.length
                ? 'All projects will be included'
                : `${selectedProjectIds.length} project${selectedProjectIds.length === 1 ? '' : 's'} selected`}
            </p>
          </div>
        </CardContent>
      </Card>

      {canGenerate ? (
        <div className="text-center space-y-4">
          {noWorkstreamsFound && (
            <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
              <CardContent className="pt-6">
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                  No clear patterns found
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-2">
                  Your achievements are quite diverse! Our AI couldn't identify
                  distinct thematic groups. This might mean:
                </p>
                <ul className="text-sm text-yellow-800 dark:text-yellow-200 mt-2 space-y-1 text-left list-disc list-inside">
                  <li>
                    You work across many different areas (which is great!)
                  </li>
                  <li>Your achievements span different technical domains</li>
                  <li>
                    More achievements might help reveal patterns over time
                  </li>
                </ul>
              </CardContent>
            </Card>
          )}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {isLoadingCount ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Counting achievements...
                </span>
              ) : (
                <>
                  You have{' '}
                  <span className="font-semibold">{achievementCount}</span>{' '}
                  achievements ready to analyze
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              We'll analyze your achievements using AI to identify patterns and
              themes
            </p>
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating || isLoadingCount}
              className="mt-4"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {generationStatus || 'Analyzing achievements...'}
                </>
              ) : noWorkstreamsFound ? (
                'Try Again'
              ) : (
                'Generate Workstreams'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <Card className="bg-muted">
          <CardContent className="pt-6 text-center">
            <p className="font-semibold">
              You need at least 20 achievements to generate workstreams
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {isLoadingCount ? (
                <span className="inline-flex items-center justify-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Counting...
                </span>
              ) : (
                <>
                  Current:{' '}
                  <span className="font-semibold">{achievementCount}</span> / 20
                </>
              )}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                window.location.href = '/achievements';
              }}
            >
              Add More Achievements
            </Button>
          </CardContent>
        </Card>
      )}
    </PageZeroState>
  );
}
