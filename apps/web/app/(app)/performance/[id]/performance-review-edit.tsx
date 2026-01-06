'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

import { CollapsibleSection } from '@/components/performance-review/collapsible-section';
import { DateRangePicker } from '@/components/performance-review/date-range-picker';
import { ProjectFilter } from '@/components/performance-review/project-filter';
import { WorkstreamsSection } from '@/components/performance-review/workstreams-section';
import { InstructionsSection } from '@/components/performance-review/instructions-section';
import { DocumentSection } from '@/components/performance-review/document-section';

import {
  fakePerformanceReview,
  fakeProjects,
  fakeWorkstreams,
  fakeDocumentContent,
  fakeChatMessages,
  INSTRUCTIONS_KEY,
  SAVE_INSTRUCTIONS_KEY,
} from '@/lib/performance-review-fake-data';

export function PerformanceReviewEdit() {
  const router = useRouter();

  // Performance review state
  const [name, setName] = useState(fakePerformanceReview.name);
  const [startDate, setStartDate] = useState(fakePerformanceReview.startDate);
  const [endDate, setEndDate] = useState(fakePerformanceReview.endDate);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
    fakeProjects.map((p) => p.id),
  );

  // Section states
  const [instructions, setInstructions] = useState('');
  const [saveInstructions, setSaveInstructions] = useState(false);
  const [document, setDocument] = useState<string | null>(null);

  // UI states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  // Handle document generation (fake - just sets the fake content)
  const handleGenerate = () => {
    setDocument(fakeDocumentContent);
  };

  // Handle document content change
  const handleDocumentChange = (content: string) => {
    setDocument(content);
  };

  // Handle delete confirmation
  const handleDelete = () => {
    setDeleteDialogOpen(false);
    router.push('/performance');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Fixed header section */}
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="flex flex-col gap-4 p-2 lg:flex-row lg:items-center lg:justify-between lg:p-4">
          {/* Name + Delete */}
          <div className="flex items-center gap-2">
            {/* Inline editable name - input styled to look like text until focused */}
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-auto border-transparent bg-transparent px-2 py-1 text-lg font-semibold hover:border-input focus:border-input"
              aria-label="Performance review name"
            />

            {/* Delete button with AlertDialog */}
            <AlertDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete performance review"
                >
                  <IconTrash className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Performance Review</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this performance review?
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Date range + Project filter */}
          <div className="flex items-center gap-2">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
            <ProjectFilter
              projects={fakeProjects}
              selectedProjectIds={selectedProjectIds}
              onSelectionChange={setSelectedProjectIds}
            />
          </div>
        </div>
      </header>

      {/* Scrollable content area */}
      <div className="flex-1 space-y-4 overflow-y-auto p-2 lg:space-y-6 lg:p-6">
        {/* Workstreams Section */}
        <CollapsibleSection
          title="Workstreams"
          subtitle="Your work themes during this review period"
        >
          <WorkstreamsSection
            workstreams={fakeWorkstreams}
            startDate={startDate}
            endDate={endDate}
          />
        </CollapsibleSection>

        {/* Instructions Section */}
        <CollapsibleSection
          title="Generation Instructions"
          subtitle="Customize how your performance review is generated"
        >
          <InstructionsSection
            value={instructions}
            onChange={setInstructions}
            saveToLocalStorage={saveInstructions}
            onSaveToggle={setSaveInstructions}
          />
        </CollapsibleSection>

        {/* Document Section */}
        <CollapsibleSection
          title="Performance Review Document"
          subtitle="Your generated performance review"
        >
          <DocumentSection
            document={document}
            onDocumentChange={handleDocumentChange}
            onGenerate={handleGenerate}
            chatMessages={fakeChatMessages}
          />
        </CollapsibleSection>
      </div>
    </div>
  );
}
