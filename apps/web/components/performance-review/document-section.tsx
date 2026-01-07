'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { IconSparkles } from '@tabler/icons-react';
import { DefaultChatTransport } from 'ai';
import { Button } from '@/components/ui/button';
import { DocumentEditor } from './document-editor';
import { ChatInterface } from './chat-interface';

interface DocumentSectionProps {
  document: string | null;
  onDocumentChange: (content: string) => void;
  onGenerate: () => void;
  generationInstructions: string;
}

export function DocumentSection({
  document,
  onDocumentChange,
  onGenerate,
  generationInstructions,
}: DocumentSectionProps) {
  const [input, setInput] = useState('');

  const { messages, status, error, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/performance-review/chat',
      body: {
        generationInstructions,
      },
    }),
  });

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
        <ChatInterface
          messages={messages}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          status={status}
          error={error}
        />
      </div>
    </div>
  );
}
