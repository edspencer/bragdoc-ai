'use client';

import { IconSparkles } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { DocumentEditor } from './document-editor';
import { ChatInterface } from './chat-interface';
import type { FakeChatMessage } from '@/lib/performance-review-fake-data';

interface DocumentSectionProps {
  document: string | null;
  onDocumentChange: (content: string) => void;
  onGenerate: () => void;
  chatMessages: FakeChatMessage[];
}

export function DocumentSection({
  document,
  onDocumentChange,
  onGenerate,
  chatMessages,
}: DocumentSectionProps) {
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
        <Button onClick={onGenerate} size="lg">
          <IconSparkles className="size-5" />
          Generate Document
        </Button>
      </div>
    );
  }

  // Generated state - split layout with document and chat
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Document panel - 2/3 width on desktop */}
      <div className="flex-1 lg:w-2/3">
        <DocumentEditor content={document} onChange={onDocumentChange} />
      </div>

      {/* Chat panel - 1/3 width on desktop */}
      <div className="lg:w-1/3">
        <ChatInterface messages={chatMessages} />
      </div>
    </div>
  );
}
