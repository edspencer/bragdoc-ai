import { getAuthUser } from '@/lib/getAuthUser';
import { getMessagesByChatId, getChatById } from '@bragdoc/database';
import type { Message } from '@bragdoc/database';
import type { ChatMessage } from '@/lib/types';

function convertMessagesToChatMessages(messages: Message[]): ChatMessage[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: msg.parts as any,
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return Response.json({ error: 'Chat ID is required' }, { status: 400 });
  }

  const auth = await getAuthUser(request);

  if (!auth?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify user has access to this chat
    const chat = await getChatById({ id: chatId });

    if (!chat) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (chat.userId !== auth.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get messages for this chat
    const messagesFromDb = await getMessagesByChatId({ id: chatId });
    const chatMessages = convertMessagesToChatMessages(messagesFromDb);

    return Response.json(chatMessages);
  } catch (error) {
    console.error('Error loading messages:', error);
    return Response.json(
      { error: 'An error occurred while loading messages' },
      { status: 500 },
    );
  }
}
