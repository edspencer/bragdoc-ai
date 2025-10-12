'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from 'components/ui/alert-dialog';
import { StandupForm } from './standup-form';
import { RecentAchievementsTable } from './recent-achievements-table';
import { CurrentStandupEditor } from './current-standup-editor';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { toast } from 'sonner';
import { useAchievementMutations } from 'hooks/use-achievement-mutations';
import { fromMask } from '@/lib/scheduling/weekdayMask';
import { formatStandupScope } from '@/lib/standups/format-scope';
import type { Company, Project, Standup } from '@bragdoc/database';
import { NextStandupIndicator } from './next-standup-indicator';

interface ExistingStandupPageProps {
  standup: Standup;
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

export function ExistingStandupContent({ standup }: ExistingStandupPageProps) {
  const router = useRouter();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/standups/${standup.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete standup');
      }

      toast.success('Standup deleted successfully');
      setShowDeleteDialog(false);
      router.refresh();
    } catch (error) {
      console.error('Error deleting standup:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete standup'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImpactChange = async (id: string, impact: number) => {
    try {
      await updateAchievement(id, {
        impact,
        impactSource: 'user',
        impactUpdatedAt: new Date(),
      });
      // Note: The RecentAchievementsTable component will handle its own data refetching
    } catch (error) {
      console.error('Error updating impact:', error);
      toast.error('Failed to update impact');
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="border-b bg-background px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{standup.name}</h1>
            <NextStandupIndicator
              meetingTime={standup.meetingTime}
              daysMask={standup.daysMask}
              timezone={standup.timezone}
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">
                {formatStandupScope(
                  standup.companyId,
                  standup.projectIds,
                  companies,
                  projects
                )}
              </span>
              <span className="mx-2">/</span>
              <span>
                {formatStandupSchedule(standup.meetingTime, standup.daysMask)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditDialog(true)}
              >
                <IconEdit className="size-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <IconTrash className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
        {/* Left column */}
        <div className="space-y-6">
          <CurrentStandupEditor
            standupId={standup.id}
            standup={standup}
            onAchievementImpactChange={handleImpactChange}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <RecentAchievementsTable
            standupId={standup.id}
            standup={standup}
            onImpactChange={handleImpactChange}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your standup and all associated
              updates. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
