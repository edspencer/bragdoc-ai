'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useState } from 'react';
import { Artifact } from '@/components/artifact';
import { useArtifact } from '@/hooks/use-artifact';
import { generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '@/app/(app)/chat/actions';
import { toast } from 'sonner';

interface DocumentCanvasProps {
  documentId: string;
  onClose: () => void;
}

export function DocumentCanvas({ documentId, onClose }: DocumentCanvasProps) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState('');
  const { setArtifact, artifact } = useArtifact();

  // Debug: log artifact state changes
  useEffect(() => {
    console.log('DocumentCanvas - artifact state:', {
      isVisible: artifact.isVisible,
      documentId: artifact.documentId,
      title: artifact.title,
    });
  }, [artifact]);

  const chat = useChat({
    id: chatId || undefined,
  });

  useEffect(() => {
    // Initialize artifact state immediately before async operations
    setArtifact({
      documentId: documentId,
      kind: 'text',
      title: '',
      content: '',
      isVisible: true,
      status: 'idle',
      boundingBox: {
        top: 0,
        left: 0,
        width: 100,
        height: 100,
      },
    });

    async function loadDocumentAndChat() {
      try {
        // Fetch the document to get its chatId and create artifact
        const response = await fetch(
          `/api/documents/${documentId}/artifact?id=${documentId}`
        );

        if (!response.ok) {
          throw new Error('Failed to load document');
        }

        const documents = await response.json();
        const latestDoc = documents[0];

        if (!latestDoc) {
          throw new Error('Document not found');
        }

        // Use existing chat if available, otherwise generate a new ID
        // The chat will be created when the user sends their first message
        const chatIdToUse = latestDoc.chatId || generateUUID();

        // If document doesn't have a chatId yet, link it now
        if (!latestDoc.chatId) {
          const updateResponse = await fetch(`/api/documents/${documentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: chatIdToUse,
            }),
          });

          if (!updateResponse.ok) {
            console.error('Failed to update document with chatId');
          }
        }

        setChatId(chatIdToUse);

        // Update artifact state with document details
        setArtifact((current) => ({
          ...current,
          kind: (latestDoc.kind || 'text') as 'text',
          title: latestDoc.title,
          content: latestDoc.content || '',
          isVisible: true,
        }));
      } catch (error) {
        console.error('Error loading document and chat:', error);
        toast.error('Failed to load document. Please try again.');
        onClose(); // Close canvas on error
      } finally {
        setIsLoading(false);
      }
    }

    loadDocumentAndChat();
  }, [documentId, onClose, setArtifact]);

  if (isLoading || !chatId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <Artifact
        chatId={chatId}
        input={input}
        setInput={setInput}
        status={chat.status}
        stop={chat.stop}
        sendMessage={chat.sendMessage as any}
        messages={chat.messages as any}
        setMessages={chat.setMessages as any}
        regenerate={chat.regenerate as any}
        isReadonly={false}
      />
    </div>
  );
}
