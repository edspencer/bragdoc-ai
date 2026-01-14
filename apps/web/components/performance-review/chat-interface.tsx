'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import type { ChatStatus } from 'ai';
import ReactMarkdown from 'react-markdown';
import {
  IconChevronLeft,
  IconChevronRight,
  IconFileText,
  IconLoader2,
} from '@tabler/icons-react';
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
  isUpdating?: boolean;
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
  isUpdating = false,
}: ChatInterfaceProps) {
  const isLoading = status === 'submitted' || status === 'streaming';
  const isDisabled = isLoading || isUpdating;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isDisabled) return;

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
          {(isLoading || isUpdating) &&
            messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                  <span className="animate-pulse">
                    {isUpdating ? 'Updating document...' : 'Thinking...'}
                  </span>
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
              disabled={isDisabled}
              minHeight={40}
              maxHeight={120}
            />
            <PromptInputToolbar className="justify-end">
              <PromptInputSubmit
                status={status}
                disabled={isDisabled || !input.trim()}
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

function hasDocumentUpdateToolCall(message: UIMessage): {
  hasToolCall: boolean;
  isComplete: boolean;
} {
  if (!message?.parts) {
    return { hasToolCall: false, isComplete: false };
  }

  for (const part of message.parts) {
    // Tool parts have type like "tool-updatePerformanceReviewDocument"
    // and state like "input-available" or "output-available"
    const toolPart = part as { type: string; state?: string };
    if (toolPart.type === 'tool-updatePerformanceReviewDocument') {
      const isComplete = toolPart.state === 'output-available';
      return { hasToolCall: true, isComplete };
    }
  }

  return { hasToolCall: false, isComplete: false };
}

function DocumentUpdateIndicator({ isComplete }: { isComplete: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {isComplete ? (
        <>
          <IconFileText className="h-4 w-4 text-green-600" />
          <span>Document updated</span>
        </>
      ) : (
        <>
          <IconLoader2 className="h-4 w-4 animate-spin" />
          <span>Updating document...</span>
        </>
      )}
    </div>
  );
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const content = getTextFromMessage(message);
  const { hasToolCall, isComplete } = hasDocumentUpdateToolCall(message);

  // If this is an assistant message with only a tool call (no text), show the indicator
  if (!isUser && hasToolCall && !content.trim()) {
    return (
      <div className="flex justify-start" role="listitem">
        <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
          <DocumentUpdateIndicator isComplete={isComplete} />
        </div>
      </div>
    );
  }

  // If this is an assistant message with text AND a tool call, show both
  if (!isUser && hasToolCall && content.trim()) {
    return (
      <div className="flex justify-start" role="listitem">
        <div className="max-w-[85%] space-y-2 rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
          <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
          <div className="border-t border-border/50 pt-2">
            <DocumentUpdateIndicator isComplete={isComplete} />
          </div>
        </div>
      </div>
    );
  }

  // Regular message rendering
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
