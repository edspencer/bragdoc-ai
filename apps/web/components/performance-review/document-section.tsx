'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { IconSparkles, IconLoader2 } from '@tabler/icons-react';
import { DefaultChatTransport } from 'ai';
import { Button } from '@/components/ui/button';
import { DocumentEditor } from './document-editor';
import { ChatInterface } from './chat-interface';

interface DocumentSectionProps {
  document: string | null;
  onDocumentChange: (content: string) => void;
  generationInstructions: string;
  performanceReviewId: string;
}

export function DocumentSection({
  document,
  onDocumentChange,
  generationInstructions,
  performanceReviewId,
}: DocumentSectionProps) {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
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

  // Zero state - no document generated yet
  if (!document) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 p-8">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-medium">
            Ready to generate your review
          </h3>
          <p className="text-sm text-muted-foreground">
            Click the button below to generate your performance review document
            based on your achievements and workstreams.
          </p>
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        <Button onClick={handleGenerate} size="lg" disabled={isGenerating}>
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
      </div>
    );
  }

  // Generated state - split layout with document and chat
  return (
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
  );
}
