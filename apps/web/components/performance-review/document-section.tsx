'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';
import {
  IconSparkles,
  IconLoader2,
  IconUser,
  IconTrash,
  IconDeviceFloppy,
  IconCheck,
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
import { cn } from '@/lib/utils';

interface DocumentSectionProps {
  document: string | null;
  onDocumentChange: (content: string | null) => void;
  documentId: string | null;
  generationInstructions: string;
  onInstructionsChange: (value: string) => void;
  saveInstructionsToLocalStorage: boolean;
  onSaveInstructionsToggle: (save: boolean) => void;
  performanceReviewId: string;
  chatId: string | null;
  onChatIdChange: (chatId: string | null) => void;
  // Summary props for zero state
  achievementCount: number;
  workstreamCount: number;
  totalImpact: number;
  onTabChange: (tab: string) => void;
}

export function DocumentSection({
  document,
  onDocumentChange,
  documentId,
  generationInstructions,
  onInstructionsChange,
  saveInstructionsToLocalStorage,
  onSaveInstructionsToggle,
  performanceReviewId,
  chatId,
  onChatIdChange,
  achievementCount,
  workstreamCount,
  totalImpact,
  onTabChange,
}: DocumentSectionProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [_isLoadingMessages, setIsLoadingMessages] = useState(false);

  // State for streaming document updates from chat
  const [isUpdating, setIsUpdating] = useState(false);
  const [streamedContent, setStreamedContent] = useState<string>('');

  // State for auto-save indicator
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  );

  // Ref to accumulate content during streaming (avoids stale closure issues)
  const streamedContentRef = useRef<string>('');

  // Ref to track the last saved content to avoid unnecessary saves
  const lastSavedContentRef = useRef<string | null>(null);

  // Initialize lastSavedContentRef with the initial document content
  useEffect(() => {
    if (document !== null && lastSavedContentRef.current === null) {
      lastSavedContentRef.current = document;
    }
  }, [document]);

  // Debounced auto-save for manual edits
  useEffect(() => {
    // Don't save if:
    // - No documentId (document not created yet)
    // - Document is null or empty string (zero state or "write myself" state)
    // - Currently generating or updating via AI
    // - Content hasn't changed from last save
    if (
      !documentId ||
      document === null ||
      isGenerating ||
      isUpdating ||
      document === lastSavedContentRef.current
    ) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const response = await fetch(`/api/documents/${documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: document }),
        });

        if (response.ok) {
          lastSavedContentRef.current = document;
          setSaveStatus('saved');
          // Hide "Saved" indicator after 1500ms
          setTimeout(() => setSaveStatus('idle'), 1500);
        } else {
          console.error('Failed to auto-save document');
          setSaveStatus('idle');
        }
      } catch (err) {
        console.error('Error auto-saving document:', err);
        setSaveStatus('idle');
      }
    }, 1000); // Debounce: save 1 second after user stops typing

    return () => clearTimeout(timeoutId);
  }, [document, documentId, isGenerating, isUpdating]);

  // Handle data stream events from the chat for document updates
  const handleData = useCallback(
    (part: { type: string; data: unknown }) => {
      if (part.type === 'data-chatId') {
        // Chat created - update the chatId so messages can be loaded
        const newChatId = part.data as string;
        if (newChatId && newChatId !== chatId) {
          onChatIdChange(newChatId);
        }
      } else if (part.type === 'data-clear') {
        // Start of document update - clear content and set updating state
        setIsUpdating(true);
        setStreamedContent('');
        streamedContentRef.current = '';
      } else if (part.type === 'data-textDelta') {
        // Append text delta to streamed content
        const text = part.data as string;
        streamedContentRef.current += text;
        setStreamedContent(streamedContentRef.current);
      } else if (part.type === 'data-finish') {
        // Document update complete - persist to parent state
        onDocumentChange(streamedContentRef.current);
        // Update lastSavedContentRef so we don't re-save what AI just saved
        lastSavedContentRef.current = streamedContentRef.current;
        setIsUpdating(false);
      }
      // Note: errors are handled via chatError from useChat, not via data stream
    },
    [onDocumentChange, chatId, onChatIdChange],
  );

  const {
    messages,
    setMessages,
    status,
    error: chatError,
    sendMessage,
  } = useChat({
    id: chatId || undefined,
    transport: new DefaultChatTransport({
      api: '/api/performance-review/chat',
      body: {
        generationInstructions,
        performanceReviewId,
      },
    }),
    onData: handleData,
  });

  // Load messages when chatId changes
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      setIsLoadingMessages(true);
      try {
        const response = await fetch(`/api/messages?chatId=${chatId}`);
        if (response.ok) {
          const loadedMessages = (await response.json()) as ChatMessage[];
          setMessages(loadedMessages as any);
        }
      } catch (err) {
        console.error('Error loading messages:', err);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    }

    loadMessages();
  }, [chatId, setMessages]);

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

      // Update lastSavedContentRef so we don't re-save what was just generated
      lastSavedContentRef.current = accumulatedContent;

      // After generation completes, fetch the performance review to get the chatId
      try {
        const prResponse = await fetch(
          `/api/performance-reviews/${performanceReviewId}`,
        );
        if (prResponse.ok) {
          const prData = await prResponse.json();
          if (prData.document?.chatId) {
            onChatIdChange(prData.document.chatId);
          }
        }
      } catch (fetchErr) {
        console.error('Error fetching chatId after generation:', fetchErr);
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
      onChatIdChange(null);
      setMessages([]);
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
      <div className="space-y-6 p-2 lg:p-6">
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
    <div className="h-full flex flex-col p-2 lg:p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-2 pb-4">
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

        {/* Auto-save indicator */}
        {saveStatus !== 'idle' && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {saveStatus === 'saving' ? (
              <>
                <IconDeviceFloppy className="size-4 animate-pulse" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <IconCheck className="size-4 text-green-600" />
                <span>Saved</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Document and Chat layout */}
      <div className="flex flex-1 min-h-0 flex-col gap-4 lg:flex-row lg:gap-6">
        {/* Document panel - expands when chat collapsed */}
        <div
          className={cn(
            'flex-1 min-h-0 transition-all duration-200',
            !isCollapsed && 'lg:w-2/3',
          )}
        >
          <DocumentEditor
            content={isUpdating ? streamedContent : document}
            onChange={onDocumentChange}
            isGenerating={isGenerating || isUpdating}
          />
        </div>

        {/* Chat panel - narrow when collapsed */}
        <div
          className={cn(
            'relative min-h-0 transition-all duration-200',
            isCollapsed ? 'lg:w-14' : 'lg:w-1/3',
          )}
        >
          <ChatInterface
            messages={messages}
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            status={status}
            error={chatError}
            isCollapsed={isCollapsed}
            onCollapseToggle={setIsCollapsed}
            isUpdating={isUpdating}
          />
          {/* Frosted overlay while generating (initial generation only, not tool-based updates) */}
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
