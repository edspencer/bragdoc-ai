'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useWorkstreamsActions } from '@/hooks/use-workstreams';
import { useProjects } from '@/hooks/useProjects';
import { useRouter } from 'next/navigation';

interface WorkstreamConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters?: {
    timeRange?: { startDate: string; endDate: string };
    projectIds?: string[];
  };
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

/**
 * Convert stored date range to a preset if possible
 * If the dates don't match any preset, returns null
 */
function getPresetFromDateRange(
  startDate?: string,
  endDate?: string,
): string | null {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();

  // Check if end date is approximately today
  const daysDiff =
    Math.abs(today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff > 1) return null;

  // Check each preset
  for (const preset of timePresets) {
    const { startDate: presetStart } = getDateRangeFromPreset(preset.value);
    const monthsDiff = Math.round(
      (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30),
    );
    const presetMonths = Number.parseInt(preset.value.replace('m', ''), 10);
    if (Math.abs(monthsDiff - presetMonths) <= 1) {
      return preset.value;
    }
  }

  return null;
}

export function WorkstreamConfigDialog({
  open,
  onOpenChange,
  currentFilters,
}: WorkstreamConfigDialogProps) {
  const router = useRouter();
  const [timePreset, setTimePreset] = useState('12m');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  const { projects, isLoading: projectsLoading } = useProjects();
  const { generateWorkstreams, isGenerating, generationStatus } =
    useWorkstreamsActions();

  // Initialize form with current filters when dialog opens
  useEffect(() => {
    if (open && currentFilters) {
      // Try to convert stored date range to preset
      const preset = getPresetFromDateRange(
        currentFilters.timeRange?.startDate,
        currentFilters.timeRange?.endDate,
      );
      setTimePreset(preset || '12m');

      // Pre-select projects
      setSelectedProjectIds(currentFilters.projectIds || []);
    } else if (open) {
      // Reset to defaults if no current filters
      setTimePreset('12m');
      setSelectedProjectIds([]);
    }
  }, [open, currentFilters]);

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

  // Fetch count when filters change
  useEffect(() => {
    if (!open || projectsLoading) return;
    fetchFilteredCount();
  }, [
    open,
    timePreset,
    selectedProjectIds,
    projectsLoading,
    fetchFilteredCount,
  ]);

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

  const handleSubmit = async () => {
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

      await generateWorkstreams(filters);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to regenerate workstreams:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reconfigure Workstreams</DialogTitle>
          <DialogDescription>
            Change the time range and projects used for workstream generation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Time Range Selection */}
          <div className="space-y-2">
            <Label htmlFor="config-time-range">Time Range</Label>
            <Select value={timePreset} onValueChange={setTimePreset}>
              <SelectTrigger id="config-time-range" className="w-full">
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

          {/* Achievement Count Display */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {isLoadingCount ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Counting achievements...
                </span>
              ) : (
                <>
                  <span className="font-semibold">{filteredCount ?? 0}</span>{' '}
                  achievements will be analyzed
                </>
              )}
            </p>
          </div>

          {/* Warning Message */}
          <Card className="bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800 lg:py-4">
            <CardContent className="p-0 lg:px-4">
              <p className="text-sm text-red-900 dark:text-red-100">
                <span className="font-semibold">Warning:</span> This will
                replace all existing workstreams and reassign your achievements.
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isGenerating || isLoadingCount}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {generationStatus || 'Regenerating...'}
              </>
            ) : (
              'Regenerate Workstreams'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
