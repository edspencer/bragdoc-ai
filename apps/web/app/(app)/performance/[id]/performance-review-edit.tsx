'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconTrash,
  IconTrophy,
  IconLayersSubtract,
  IconFileText,
} from '@tabler/icons-react';
import { SiteHeader } from '@/components/site-header';
import { AppContent } from '@/components/shared/app-content';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

import { DateRangePicker } from '@/components/performance-review/date-range-picker';
import { WorkstreamsTimeline } from '@/components/performance-review/workstreams-timeline';
import { DocumentSection } from '@/components/performance-review/document-section';
import { PerformanceReviewAchievementsTable } from '@/components/performance-review/performance-review-achievements-table';

import {
  INSTRUCTIONS_KEY,
  SAVE_INSTRUCTIONS_KEY,
} from '@/lib/performance-review-fake-data';

const PERFORMANCE_REVIEW_TAB_KEY = 'performance-review-tab';

import type {
  Workstream,
  PerformanceReviewWithDocument,
} from '@bragdoc/database';
import type { AchievementWithRelations } from 'lib/types/achievement';

interface PerformanceReviewEditProps {
  performanceReview: PerformanceReviewWithDocument;
  workstreams: Workstream[];
  achievements: AchievementWithRelations[];
}

export function PerformanceReviewEdit({
  performanceReview,
  workstreams,
  achievements,
}: PerformanceReviewEditProps) {
  const router = useRouter();

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

  // UI states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('review');

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

    // Restore saved tab selection
    const savedTab = localStorage.getItem(PERFORMANCE_REVIEW_TAB_KEY);
    if (
      savedTab === 'review' ||
      savedTab === 'achievements' ||
      savedTab === 'workstreams'
    ) {
      setSelectedTab(savedTab);
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

  // Handle document content change
  const handleDocumentChange = (content: string) => {
    setDocument(content);
  };

  // Handle tab change and persist to localStorage
  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    localStorage.setItem(PERFORMANCE_REVIEW_TAB_KEY, value);
  };

  // Handle delete confirmation
  const handleDelete = () => {
    setDeleteDialogOpen(false);
    router.push('/performance');
  };

  return (
    <>
      <SiteHeader title="Performance Review">
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
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SiteHeader>

      <AppContent className="space-y-4 lg:space-y-6">
        {/* Hero/Summary Section */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* Performance Review Name - Editable */}
          <div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-auto border-transparent bg-transparent px-0 py-1 text-2xl font-semibold hover:border-input focus:border-input lg:text-3xl"
              aria-label="Performance review name"
            />
          </div>

          {/* Date Range - Editable */}
          <div>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              className="border-transparent text-2xl font-semibold lg:text-3xl"
            />
          </div>
        </div>

        {/* Performance Review Tabs */}
        <Tabs value={selectedTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="review" className="gap-2">
              <IconFileText className="size-4 text-green-600" />
              Review
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <IconTrophy className="size-4 text-yellow-600" />
              Achievements
              <Badge className="ml-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200">
                {achievements.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="workstreams" className="gap-2">
              <IconLayersSubtract className="size-4 text-purple-600" />
              Workstreams
              <Badge className="ml-1 bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900 dark:text-purple-200">
                {workstreams.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="review">
            <div className="rounded-lg border-2 border-green-200 dark:border-green-800">
              <DocumentSection
                document={document}
                onDocumentChange={handleDocumentChange}
                generationInstructions={instructions}
                onInstructionsChange={setInstructions}
                saveInstructionsToLocalStorage={saveInstructions}
                onSaveInstructionsToggle={setSaveInstructions}
                performanceReviewId={performanceReview.id}
              />
            </div>
          </TabsContent>

          <TabsContent value="achievements">
            <div className="rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
              <PerformanceReviewAchievementsTable
                achievements={achievements}
                workstreams={workstreams}
              />
            </div>
          </TabsContent>

          <TabsContent value="workstreams">
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
