'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { format } from 'date-fns';
import {
  IconCalendar,
  IconEdit,
  IconTrash,
  IconTrophy,
  IconLayersSubtract,
  IconFileText,
} from '@tabler/icons-react';
import { SiteHeader } from '@/components/site-header';
import { AppContent } from '@/components/shared/app-content';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EditPerformanceReviewDialog } from '@/components/performance-review/edit-performance-review-dialog';
import { useDeletePerformanceReview } from '@/hooks/use-performance-reviews';
import { WorkstreamsTimeline } from '@/components/performance-review/workstreams-timeline';
import { DocumentSection } from '@/components/performance-review/document-section';
import { PerformanceReviewAchievementsTable } from '@/components/performance-review/performance-review-achievements-table';
import { GuidedTourButton } from '@/components/demo-tour';

import {
  INSTRUCTIONS_KEY,
  SAVE_INSTRUCTIONS_KEY,
} from '@/lib/performance-review-fake-data';

import type {
  Workstream,
  PerformanceReviewWithDocument,
} from '@bragdoc/database';
import type { AchievementWithRelationsUI } from 'lib/types/achievement';

interface PerformanceReviewEditProps {
  performanceReview: PerformanceReviewWithDocument;
  workstreams: Workstream[];
  achievements: AchievementWithRelationsUI[];
  initialTab: string;
  performanceReviewId: string;
}

export function PerformanceReviewEdit({
  performanceReview,
  workstreams,
  achievements,
  initialTab,
  performanceReviewId,
}: PerformanceReviewEditProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Performance review state
  const [name, setName] = useState(performanceReview.name);
  const [startDate, setStartDate] = useState(performanceReview.startDate);
  const [endDate, setEndDate] = useState(performanceReview.endDate);

  // Section states
  const [instructions, setInstructions] = useState('');
  const [saveInstructions, setSaveInstructions] = useState(false);
  const [document, setDocument] = useState<string | null>(
    performanceReview.document?.content ?? null,
  );
  const [chatId, setChatId] = useState<string | null>(
    performanceReview.document?.chatId ?? null,
  );

  // UI states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTab, setSelectedTab] = useState(initialTab);

  // Hooks
  const deletePerformanceReview = useDeletePerformanceReview();

  // Track if component is mounted (to prevent state updates during render)
  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // On mount - restore saved preference and instructions if available
  useEffect(() => {
    const savedPreference = localStorage.getItem(SAVE_INSTRUCTIONS_KEY);
    if (savedPreference === 'true') {
      setSaveInstructions(true);
      const savedInstructions = localStorage.getItem(INSTRUCTIONS_KEY);
      if (savedInstructions) {
        setInstructions(savedInstructions);
      }
    }
  }, []);

  // On instructions/preference change - update localStorage based on save preference
  useEffect(() => {
    if (saveInstructions) {
      // Save preference is true: persist both instructions and preference flag
      localStorage.setItem(INSTRUCTIONS_KEY, instructions);
      localStorage.setItem(SAVE_INSTRUCTIONS_KEY, 'true');
    } else {
      // Save preference is false: only update preference flag, keep instructions in memory
      // Note: Unchecking save preference does NOT clear stored instructions (user may re-enable)
      localStorage.setItem(SAVE_INSTRUCTIONS_KEY, 'false');
    }
  }, [instructions, saveInstructions]);

  // Sync tab state with URL changes (browser back/forward navigation)
  useEffect(() => {
    const segments = pathname.split('/');
    const lastSegment = segments[segments.length - 1] ?? '';
    const validTabs = ['review', 'achievements', 'workstreams'];

    if (validTabs.includes(lastSegment) && lastSegment !== selectedTab) {
      setSelectedTab(lastSegment);
    } else if (!validTabs.includes(lastSegment) && selectedTab !== 'review') {
      // URL is /performance/[id] without tab segment - default to 'review'
      setSelectedTab('review');
    }
  }, [pathname, selectedTab]);

  // Handle document content change (guard against updates before mount)
  const handleDocumentChange = (content: string | null) => {
    if (isMounted.current) {
      setDocument(content);
    }
  };

  // Handle tab change and update URL
  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    // Navigate to new URL, adding to browser history
    const basePath = `/performance/${performanceReviewId}`;
    const newPath = value === 'review' ? basePath : `${basePath}/${value}`;
    router.push(newPath);
  };

  // Handle edit update
  const handleUpdate = (data: {
    name: string;
    startDate: Date;
    endDate: Date;
  }) => {
    setName(data.name);
    setStartDate(data.startDate);
    setEndDate(data.endDate);
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePerformanceReview(performanceReview.id);
      setDeleteDialogOpen(false);
      router.push('/performance');
    } catch (error) {
      console.error('Error deleting performance review:', error);
      setIsDeleting(false);
    }
  };

  // Format date range for display
  const formatDateRange = () => {
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    if (startYear === endYear) {
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
    return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
  };

  return (
    <>
      <SiteHeader title={name}>
        {/* Date range display */}
        <div className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
          <IconCalendar className="size-4" />
          <span>{formatDateRange()}</span>
        </div>

        <Separator orientation="vertical" className="hidden h-4 sm:block" />

        {/* Edit button */}
        <Button
          id="tour-perf-review-edit"
          variant="ghost"
          size="icon"
          onClick={() => setEditDialogOpen(true)}
          aria-label="Edit performance review"
        >
          <IconEdit className="size-4" />
        </Button>

        {/* Delete button with AlertDialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-600"
              aria-label="Delete performance review"
            >
              <IconTrash className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Performance Review</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this performance review? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <GuidedTourButton tourId="tour-performance-review" />
      </SiteHeader>

      {/* Edit performance review dialog */}
      <EditPerformanceReviewDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        performanceReviewId={performanceReview.id}
        initialData={{
          name,
          startDate,
          endDate,
        }}
        onUpdate={handleUpdate}
      />

      <AppContent
        className={cn(
          selectedTab === 'review' &&
            'sm:h-[calc(100dvh-var(--header-height))] sm:overflow-hidden',
        )}
      >
        {/* Performance Review Tabs */}
        <Tabs
          value={selectedTab}
          onValueChange={handleTabChange}
          className="flex h-full flex-col gap-0"
        >
          <TabsList
            id="tour-perf-review-tabs"
            className="lg:ml-4 gap-0 h-16 overflow-visible"
          >
            <TabsTrigger
              value="review"
              className={cn(
                'relative gap-2 rounded-b-none border-2 border-b-0 -mb-[2px] px-1 lg:px-4 py-2 pb-[6px] text-base lg:text-2xl cursor-pointer',
                selectedTab === 'review'
                  ? 'border-green-200 bg-background z-10 dark:border-green-800'
                  : 'border-transparent bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              <IconFileText className="size-5 lg:size-8  text-green-600" />
              Review
            </TabsTrigger>
            <TabsTrigger
              value="achievements"
              className={cn(
                'relative gap-2 rounded-b-none border-2 border-b-0 -mb-[2px] px-1 lg:px-4 py-2 pb-[6px] text-base lg:text-2xl cursor-pointer',
                selectedTab === 'achievements'
                  ? 'border-yellow-200 bg-background z-10 dark:border-yellow-800'
                  : 'border-transparent bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              <IconTrophy className="size-5 lg:size-8 text-yellow-600" />
              Achievements
              <Badge className="ml-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200">
                {achievements.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="workstreams"
              className={cn(
                'relative gap-2 rounded-b-none border-2 border-b-0 -mb-[2px] px-1 lg:px-4 py-2 pb-[6px] text-base lg:text-2xl cursor-pointer',
                selectedTab === 'workstreams'
                  ? 'border-purple-200 bg-background z-10 dark:border-purple-800'
                  : 'border-transparent bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              <IconLayersSubtract className="size-5 lg:size-8 text-purple-600" />
              Workstreams
              <Badge className="ml-1 bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900 dark:text-purple-200">
                {workstreams.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="review"
            className="mt-0 sm:flex-1 sm:min-h-0 sm:overflow-hidden"
          >
            <div className="h-full rounded-lg border-2 border-green-200 dark:border-green-800">
              <DocumentSection
                document={document}
                onDocumentChange={handleDocumentChange}
                documentId={performanceReview.document?.id ?? null}
                generationInstructions={instructions}
                onInstructionsChange={setInstructions}
                saveInstructionsToLocalStorage={saveInstructions}
                onSaveInstructionsToggle={setSaveInstructions}
                performanceReviewId={performanceReview.id}
                chatId={chatId}
                onChatIdChange={setChatId}
                achievementCount={achievements.length}
                workstreamCount={workstreams.length}
                totalImpact={achievements.reduce(
                  (sum, a) => sum + (a.impact ?? 0),
                  0,
                )}
                onTabChange={handleTabChange}
              />
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="mt-0">
            <div className="rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
              <PerformanceReviewAchievementsTable
                achievements={achievements}
                workstreams={workstreams}
              />
            </div>
          </TabsContent>

          <TabsContent value="workstreams" className="mt-0">
            <div className="rounded-lg border-2 border-purple-200 dark:border-purple-800">
              <WorkstreamsTimeline
                workstreams={workstreams}
                achievements={achievements}
                startDate={startDate}
                endDate={endDate}
              />
            </div>
          </TabsContent>
        </Tabs>
      </AppContent>
    </>
  );
}
