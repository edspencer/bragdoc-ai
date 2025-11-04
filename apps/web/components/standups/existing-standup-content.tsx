'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog';
import { StandupForm } from './standup-form';
import { RecentAchievementsTable } from './recent-achievements-table';
import { CurrentStandupEditor } from './current-standup-editor';
import { toast } from 'sonner';
import { useAchievementMutations } from 'hooks/use-achievement-mutations';
import { fromMask } from '@/lib/scheduling/weekdayMask';
import { formatStandupScope } from '@/lib/standups/format-scope';
import type { Company, Project, Standup } from '@bragdoc/database';
import { NextStandupIndicator } from './next-standup-indicator';
import { BetaFeatureBanner } from '@/components/shared/beta-feature-banner';

interface ExistingStandupContentProps {
  standup: Standup;
  onEditClick?: () => void;
  showEditDialog?: boolean;
  onEditDialogChange?: (open: boolean) => void;
}

/**
 * Format the standup schedule as a readable string (e.g., "10am M-F")
 */
function formatStandupSchedule(meetingTime: string, daysMask: number): string {
  // Format time (HH:mm -> 10am)
  const timeParts = meetingTime.split(':').map(Number);
  const hours = timeParts[0] ?? 0;
  const minutes = timeParts[1] ?? 0;
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  const timeStr =
    minutes > 0
      ? `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`
      : `${displayHours}${period}`;

  // Format days
  const days = fromMask(daysMask);
  let daysStr: string;

  // Check for common patterns
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const isWeekdays =
    weekdays.every((day) => days.includes(day as any)) && days.length === 5;

  if (isWeekdays) {
    daysStr = 'M-F';
  } else if (days.length === 7) {
    daysStr = 'Daily';
  } else if (days.length === 1) {
    daysStr = days[0] ?? 'Mon';
  } else if (days.length > 0) {
    // Show abbreviated days (e.g., "M W F")
    daysStr = days.map((d) => d.charAt(0)).join(' ');
  } else {
    daysStr = 'No days';
  }

  return `${timeStr} ${daysStr}`;
}

export function ExistingStandupContent({
  standup,
  showEditDialog: externalShowEditDialog,
  onEditDialogChange,
}: ExistingStandupContentProps) {
  const router = useRouter();
  const [internalShowEditDialog, setInternalShowEditDialog] = useState(false);

  // Use external state if provided, otherwise use internal state
  const showEditDialog = externalShowEditDialog ?? internalShowEditDialog;
  const setShowEditDialog = onEditDialogChange ?? setInternalShowEditDialog;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Refresh key used by both child components to trigger data refetch when achievements change
  const [refreshKey, setRefreshKey] = useState(0);

  const { updateAchievement } = useAchievementMutations();

  // Fetch companies and projects for scope display
  useEffect(() => {
    async function fetchCompaniesAndProjects() {
      try {
        const [companiesRes, projectsRes] = await Promise.all([
          fetch('/api/companies'),
          fetch('/api/projects'),
        ]);

        if (companiesRes.ok) {
          const data = await companiesRes.json();
          setCompanies(Array.isArray(data) ? data : []);
        }

        if (projectsRes.ok) {
          const data = await projectsRes.json();
          setProjects(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error fetching companies/projects:', error);
      }
    }
    fetchCompaniesAndProjects();
  }, []);

  const handleImpactChange = async (id: string, impact: number) => {
    try {
      await updateAchievement(id, {
        impact,
        impactSource: 'user',
        impactUpdatedAt: new Date(),
      });
      // Trigger refresh in both child components
      triggerRefresh();
    } catch (error) {
      console.error('Error updating impact:', error);
      toast.error('Failed to update impact');
    }
  };

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Info section below SiteHeader */}
      <div className="border-b bg-background sm:px-8 sm:py-4 p-2">
        <div className="flex-col flex sm:flex-row gap-2 items-start sm:items-center justify-between">
          <div>
            <NextStandupIndicator
              meetingTime={standup.meetingTime}
              daysMask={standup.daysMask}
              timezone={standup.timezone}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">
              {formatStandupScope(
                standup.companyId,
                standup.projectIds,
                companies,
                projects,
              )}
            </span>
            <span className="mx-2">/</span>
            <span>
              {formatStandupSchedule(standup.meetingTime, standup.daysMask)}
            </span>
          </div>
        </div>
      </div>

      {/* Beta Banner */}
      <div className="px-2 lg:px-8 pt-2 lg:pt-6">
        <BetaFeatureBanner />
      </div>

      {/* Two-column layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:p-8 p-2">
        {/* Left column */}
        <div className="space-y-6">
          <CurrentStandupEditor
            key={`current-${refreshKey}`}
            standupId={standup.id}
            standup={standup}
            onAchievementImpactChange={handleImpactChange}
            onRefresh={triggerRefresh}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <RecentAchievementsTable
            key={`recent-${refreshKey}`}
            standupId={standup.id}
            standup={standup}
            onImpactChange={handleImpactChange}
            onRefresh={triggerRefresh}
          />
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Standup</DialogTitle>
          </DialogHeader>
          <StandupForm
            initialData={{
              ...standup,
              projectIds: standup.projectIds || [],
              instructions: standup.instructions || undefined,
            }}
            isEdit
            onSuccess={() => {
              setShowEditDialog(false);
              router.refresh();
            }}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
