'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { Artifact } from '@/components/artifact';
import { useArtifact } from '@/hooks/use-artifact';
import { useDataStream } from '@/components/data-stream-provider';

/**
 * Global artifact canvas component that can be opened from anywhere in the app.
 *
 * To open a document in canvas mode from any page:
 *
 * 1. Load the document's chat messages
 * 2. Call setArtifact with:
 *    - documentId
 *    - chatId
 *    - title
 *    - content
 *    - kind
 *    - isVisible: true
 *
 * Example:
 * ```
 * const messages = await fetch(`/api/messages?chatId=${chatId}`).then(r => r.json());
 * setArtifact({
 *   documentId: doc.id,
 *   chatId: doc.chatId,
 *   title: doc.title,
 *   content: doc.content,
 *   kind: 'text',
 *   isVisible: true,
 *   status: 'idle',
 *   boundingBox: { top: 0, left: 0, width: 100, height: 100 },
 * });
 * ```
 */
export function ArtifactCanvas() {
  const { artifact } = useArtifact();
  const [input, setInput] = React.useState('');
  const [initialMessages, setInitialMessages] = React.useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);
  const { setDataStream } = useDataStream();

  // Load messages when chatId changes
  React.useEffect(() => {
    if (!artifact.chatId || artifact.documentId === 'init') {
      setInitialMessages([]);
      return;
    }

    async function loadMessages() {
      setIsLoadingMessages(true);
      try {
        const response = await fetch(`/api/messages?chatId=${artifact.chatId}`);
        if (response.ok) {
          const messages = await response.json();
          setInitialMessages(messages);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        setInitialMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    }

    loadMessages();
  }, [artifact.chatId, artifact.documentId]);

  const chat = useChat({
    id: artifact.chatId || undefined,
    messages: initialMessages,
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart as any] : []));
    },
  });

  // Only render if we have a chatId and messages are loaded
  if (!artifact.chatId || isLoadingMessages) {
    return null;
  }

  return (
    <Artifact
      chatId={artifact.chatId}
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
  );
}
