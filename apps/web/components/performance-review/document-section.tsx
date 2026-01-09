'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  IconSparkles,
  IconLoader2,
  IconUser,
  IconTrash,
} from '@tabler/icons-react';
import { DefaultChatTransport } from 'ai';
import { Button } from '@/components/ui/button';
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
import { DocumentEditor } from './document-editor';
import { ChatInterface } from './chat-interface';
import { InstructionsSection } from './instructions-section';
import { PerformanceReviewSummary } from './performance-review-summary';

interface DocumentSectionProps {
  document: string | null;
  onDocumentChange: (content: string | null) => void;
  generationInstructions: string;
  onInstructionsChange: (value: string) => void;
  saveInstructionsToLocalStorage: boolean;
  onSaveInstructionsToggle: (save: boolean) => void;
  performanceReviewId: string;
  // Summary props for zero state
  achievementCount: number;
  workstreamCount: number;
  totalImpact: number;
  onTabChange: (tab: string) => void;
}

export function DocumentSection({
  document,
  onDocumentChange,
  generationInstructions,
  onInstructionsChange,
  saveInstructionsToLocalStorage,
  onSaveInstructionsToggle,
  performanceReviewId,
  achievementCount,
  workstreamCount,
  totalImpact,
  onTabChange,
}: DocumentSectionProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    messages,
    status,
    error: chatError,
    sendMessage,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/performance-review/chat',
      body: {
        generationInstructions,
        performanceReviewId,
      },
    }),
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/performance-review/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          performanceReviewId,
          generationInstructions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate document');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;
        onDocumentChange(accumulatedContent);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteDocument = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/performance-reviews/${performanceReviewId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: null }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Clear local state to return to zero state
      onDocumentChange(null);
    } catch (err) {
      console.error('Error deleting document:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to delete document',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Zero state - no document generated yet (null means not started, empty string means user chose to write)
  if (document === null) {
    return (
      <div className="space-y-6 p-6">
        {/* Summary section */}
        <PerformanceReviewSummary
          achievementCount={achievementCount}
          workstreamCount={workstreamCount}
          totalImpact={totalImpact}
          onTabChange={onTabChange}
        />

        {/* Document generation section */}
        <div className="flex flex-col items-center justify-center rounded-lg bg-muted/30">
          <div className="flex w-full max-w-2xl flex-col gap-4">
            {' '}
            <InstructionsSection
              value={generationInstructions}
              onChange={onInstructionsChange}
              saveToLocalStorage={saveInstructionsToLocalStorage}
              onSaveToggle={onSaveInstructionsToggle}
            />
            {error && <div className="text-sm text-destructive">{error}</div>}
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button
                onClick={handleGenerate}
                size="lg"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <IconLoader2 className="size-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <IconSparkles className="size-5" />
                    Generate Document
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => onDocumentChange('')}
                disabled={isGenerating}
              >
                <IconUser className="size-5" />
                I'll write it myself
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Generated state - split layout with document and chat
  return (
    <div className="space-y-4 p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Performance Review Document</h1>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-600"
              aria-label="Delete document"
            >
              <IconTrash className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this document? This will clear
                all content and return you to the document generation screen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteDocument}
                className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Document and Chat layout */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        {/* Document panel - 2/3 width on desktop */}
        <div className="flex-1 lg:w-2/3">
          <DocumentEditor
            content={document}
            onChange={onDocumentChange}
            isGenerating={isGenerating}
          />
        </div>

        {/* Chat panel - 1/3 width on desktop */}
        <div className="relative lg:w-1/3">
          <ChatInterface
            messages={messages}
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            status={status}
            error={chatError}
          />
          {/* Frosted overlay while generating */}
          {isGenerating && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm">
              <span className="animate-pulse text-sm font-medium text-muted-foreground">
                Generating Document...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
