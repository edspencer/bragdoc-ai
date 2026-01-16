import { getAuthUser } from '@/lib/getAuthUser';
import {
  streamText,
  createUIMessageStream,
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  JsonToSseTransformStream,
} from 'ai';
import type { UIMessage } from 'ai';
import { routerModel } from '@/lib/ai';
import {
  getPerformanceReviewById,
  getWorkstreamsByUserIdWithDateFilter,
  saveChat,
  saveMessages,
  getMessagesByChatId,
  getChatById,
  updateChatLastContextById,
  updateDocument,
} from '@bragdoc/database';
import type { User, Message } from '@bragdoc/database';
import { format } from 'date-fns';
import { updatePerformanceReviewDocument } from '@/lib/ai/tools/update-performance-review-document';
import type { ChatMessage } from '@/lib/types';
import { generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '@/app/(app)/chat/actions';

export const maxDuration = 60;

function convertMessagesToChatMessages(messages: Message[]): ChatMessage[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: msg.parts as any,
  }));
}

interface RequestBody {
  messages?: UIMessage[];
  message?: ChatMessage;
  generationInstructions?: string;
  performanceReviewId: string;
}

export async function POST(request: Request) {
  try {
    // Authenticate user
    const auth = await getAuthUser(request);

    if (!auth?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = auth.user as User;

    // Parse request body
    const body = (await request.json()) as RequestBody;
    const { generationInstructions, performanceReviewId } = body;

    // Validate performanceReviewId
    if (!performanceReviewId) {
      return Response.json(
        { error: 'performanceReviewId is required' },
        { status: 400 },
      );
    }

    // Handle both formats: { message } from custom transport and { messages } from default transport
    const message: ChatMessage | undefined =
      body.message || (body.messages?.at(-1) as ChatMessage | undefined);

    if (!message) {
      return Response.json({ error: 'No message provided' }, { status: 400 });
    }

    // Fetch the performance review to get the date range and document
    const performanceReview = await getPerformanceReviewById(
      performanceReviewId,
      auth.user.id,
    );

    if (!performanceReview) {
      return Response.json(
        { error: 'Performance review not found' },
        { status: 404 },
      );
    }

    // Get or create chatId for this document
    let chatId = performanceReview.document?.chatId;

    if (!chatId && performanceReview.document) {
      // Document exists but no chat - create a new chat and link it
      chatId = generateUUID();
      const title = await generateTitleFromUserMessage({ message });
      await saveChat({ id: chatId, userId: user.id, title });

      // Update the document to link the chatId
      await updateDocument({
        id: performanceReview.document.id,
        userId: user.id,
        data: { chatId },
      });
    } else if (chatId) {
      // Verify chat exists and belongs to user
      const chat = await getChatById({ id: chatId });
      if (!chat) {
        // Chat doesn't exist, create it
        const title = await generateTitleFromUserMessage({ message });
        await saveChat({ id: chatId, userId: user.id, title });
      } else if (chat.userId !== user.id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Load existing messages from database and add new user message
    let uiMessages: ChatMessage[] = [];
    if (chatId) {
      const messagesFromDb = await getMessagesByChatId({ id: chatId });
      uiMessages = convertMessagesToChatMessages(messagesFromDb);
    }
    uiMessages = [...uiMessages, message];

    // Save the new user message if we have a chatId
    if (chatId) {
      const messageId = message.id?.includes('-') ? message.id : generateUUID();
      await saveMessages({
        messages: [
          {
            chatId: chatId,
            id: messageId,
            role: 'user',
            parts: message.parts as any,
            attachments: [],
            createdAt: new Date(),
          },
        ],
      });
    }

    let finalUsage: any;

    // Fetch real workstreams for the performance review's date range
    const workstreams = await getWorkstreamsByUserIdWithDateFilter(
      auth.user.id,
      performanceReview.startDate,
      performanceReview.endDate,
    );

    // Build system prompt with workstreams context
    const workstreamsContext =
      workstreams.length > 0
        ? workstreams
            .map(
              (ws) => `- ${ws.name}: ${ws.achievementCount ?? 0} achievements`,
            )
            .join('\n')
        : 'No workstreams found for this review period.';

    // Build document context
    const contentPreview = performanceReview.document?.content
      ? performanceReview.document.content.length > 2000
        ? `${performanceReview.document.content.substring(0, 2000)}...`
        : performanceReview.document.content
      : '';

    const documentContext = performanceReview.document
      ? `
The user has a performance review document:
- Document ID: ${performanceReview.document.id}
- Content Preview:
${contentPreview}
`
      : `
The user has not generated a document yet. If they ask to update or modify the document, suggest they generate one first using the "Generate Document" button.
`;

    const systemPrompt = `You are an AI assistant helping users refine their performance review documents.

The user is working on a performance review document for the period ${format(performanceReview.startDate, 'MMMM d, yyyy')} to ${format(performanceReview.endDate, 'MMMM d, yyyy')}.

Their work has been organized into the following workstreams:
${workstreamsContext}

User's generation instructions:
${generationInstructions || 'No specific instructions provided.'}
${documentContext}

## CRITICAL: Using the updatePerformanceReviewDocument Tool

You have access to the \`updatePerformanceReviewDocument\` tool. This tool updates the document displayed to the user in real-time.

**YOU MUST USE THIS TOOL** whenever the user asks you to:
- Change, modify, update, edit, or revise the document
- Rewrite any part of the document
- Add, remove, or reorganize content
- Change the tone, style, or voice (e.g., "make it sound more confident", "make it like a pirate")
- Fix grammar, spelling, or formatting
- Expand or condense sections
- Any other request that implies changing the document text

**DO NOT** simply reply with the updated text in your chat message. The user expects the document panel to update directly.

**Examples of when to use the tool:**
- "Make it sound more professional" → Use the tool to rewrite with professional tone
- "Add more detail about the API project" → Use the tool to expand that section
- "Make it shorter" → Use the tool to condense the content
- "Write it like I'm a pirate" → Use the tool to rewrite in pirate voice
- "Fix the grammar" → Use the tool to correct grammar issues
- "Reorganize by impact" → Use the tool to restructure the document

**When NOT to use the tool:**
- User asks a question about the document (just answer)
- User asks for suggestions without wanting changes applied (explain your suggestions)
- User asks you to explain something (just explain)

When using the tool, provide the complete updated document content. Be concise in your chat responses - the main output should be the updated document.`;

    // Create streaming response with document update tool
    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        // Send chatId to frontend so it can update state and load messages
        if (chatId) {
          dataStream.write({ type: 'data-chatId', data: chatId });
        }

        const result = streamText({
          model: routerModel,
          system: systemPrompt,
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            updatePerformanceReviewDocument: updatePerformanceReviewDocument({
              user,
              dataStream,
              performanceReviewId,
            }),
          },
          onFinish: async ({ usage }) => {
            finalUsage = usage;
            dataStream.write({ type: 'data-usage', data: usage });
          },
        });

        result.consumeStream();
        dataStream.merge(result.toUIMessageStream({ sendReasoning: true }));
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        // Save all assistant messages if we have a chatId
        if (chatId) {
          await saveMessages({
            messages: messages.map((currentMessage) => {
              const msgId = currentMessage.id?.includes('-')
                ? currentMessage.id
                : generateUUID();
              return {
                id: msgId,
                role: currentMessage.role,
                parts: currentMessage.parts,
                createdAt: new Date(),
                attachments: [],
                chatId: chatId!,
              };
            }),
          });

          // Update chat usage tracking
          if (finalUsage) {
            try {
              await updateChatLastContextById({
                chatId: chatId,
                context: {
                  promptTokens: finalUsage.promptTokens,
                  completionTokens: finalUsage.completionTokens,
                  totalTokens: finalUsage.totalTokens,
                },
              });
            } catch (err) {
              console.warn('Unable to persist usage for chat', chatId, err);
            }
          }
        }
      },
      onError: () => 'An error occurred while processing your request.',
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    console.error('Error in performance review chat:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
