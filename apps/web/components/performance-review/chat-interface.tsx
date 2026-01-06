'use client';

import { IconSend } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { FakeChatMessage } from '@/lib/performance-review-fake-data';

interface ChatInterfaceProps {
  messages: FakeChatMessage[];
}

export function ChatInterface({ messages }: ChatInterfaceProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Refine with AI</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Messages container */}
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No messages yet. Ask AI to refine your document.
            </p>
          ) : (
            messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))
          )}
        </div>

        {/* Input field */}
        <div className="flex gap-2">
          <Input
            placeholder="Ask AI to refine your document..."
            disabled
            aria-label="Chat message input"
          />
          <Button size="icon" disabled aria-label="Send message">
            <IconSend className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ChatMessageProps {
  message: FakeChatMessage;
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

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
        {message.content}
      </div>
    </div>
  );
}
