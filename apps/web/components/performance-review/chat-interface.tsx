'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import type { ChatStatus } from 'ai';
import ReactMarkdown from 'react-markdown';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
} from '@/components/elements/prompt-input';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  messages: UIMessage[];
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  sendMessage: UseChatHelpers<UIMessage>['sendMessage'];
  status: ChatStatus;
  error?: Error;
  isCollapsed: boolean;
  onCollapseToggle: (collapsed: boolean) => void;
}

export function ChatInterface({
  messages,
  input,
  setInput,
  sendMessage,
  status,
  error,
  isCollapsed,
  onCollapseToggle,
}: ChatInterfaceProps) {
  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: input }],
    });
    setInput('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Collapsed state - narrow bar with rotated title
  if (isCollapsed) {
    return (
      <Card
        className="flex h-full w-14 cursor-pointer flex-col items-center pt-2"
        onClick={() => onCollapseToggle(false)}
      >
        <IconChevronLeft className="h-4 w-4 text-muted-foreground" />
        <span className="mt-8 -rotate-90 whitespace-nowrap text-base font-semibold">
          Refine with AI
        </span>
      </Card>
    );
  }

  // Expanded state
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Refine with AI</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onCollapseToggle(true)}
            aria-label="Collapse chat panel"
          >
            <IconChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
        {/* Messages container - scrollable */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 pt-4" role="list">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No messages yet. Ask AI to refine your document.
            </p>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Error display - if present */}
        {error && (
          <div className="mx-6 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error.message || 'An error occurred. Please try again.'}
          </div>
        )}

        {/* Input container - sticky at bottom */}
        <div className="sticky bottom-0 border-t bg-card px-6 pb-4 pt-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              value={input}
              onChange={handleInputChange}
              placeholder="Ask AI to refine your document..."
              disabled={isLoading}
              minHeight={40}
              maxHeight={120}
            />
            <PromptInputToolbar className="justify-end">
              <PromptInputSubmit
                status={status}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </CardContent>
    </Card>
  );
}

interface ChatMessageProps {
  message: UIMessage;
}

function getTextFromMessage(message: UIMessage): string {
  if (!message?.parts) {
    return '';
  }
  return message.parts
    .filter(
      (part): part is { type: 'text'; text: string } => part.type === 'text',
    )
    .map((part) => part.text)
    .join(' ');
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const content = getTextFromMessage(message);

  return (
    <div
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
      role="listitem"
    >
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        {isUser ? (
          content
        ) : (
          <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
