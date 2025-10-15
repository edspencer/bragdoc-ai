import { getAuthUser } from "@/lib/getAuthUser";
import {
  getChatById,
  saveChat,
  saveMessages,
  deleteChatById,
  getMessagesByChatId,
  updateChatLastContextById,
} from "@bragdoc/database";
import type { User, Message } from "@bragdoc/database";
import { generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "@/app/(app)/chat/actions";
import { createDocument } from "@/lib/ai/tools/create-document";
import { updateDocument } from "@/lib/ai/tools/update-document";
import type { ChatMessage } from "@/lib/types";
import {
  streamText,
  createUIMessageStream,
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  JsonToSseTransformStream,
} from "ai";
import { routerModel } from "@/lib/ai";

export const maxDuration = 60;

function convertMessagesToChatMessages(messages: Message[]): ChatMessage[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: msg.parts as any,
  }));
}

export async function POST(request: Request) {
  const { id, message }: { id: string; message: ChatMessage } =
    await request.json();

  const auth = await getAuthUser(request);

  if (!auth?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = auth.user as User;

  // Check if chat exists
  const chat = await getChatById({ id });

  if (!chat) {
    // Create new chat
    const title = await generateTitleFromUserMessage({ message });
    await saveChat({ id, userId: user.id, title });
  } else if (chat.userId !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get existing messages and add new user message
  const messagesFromDb = await getMessagesByChatId({ id });
  const chatMessages = convertMessagesToChatMessages(messagesFromDb);
  const uiMessages = [...chatMessages, message];

  // Save the new user message
  await saveMessages({
    messages: [
      {
        chatId: id,
        id: message.id,
        role: "user",
        parts: message.parts as any,
        attachments: [],
        createdAt: new Date(),
      },
    ],
  });

  let finalUsage: any;

  // Create streaming response with document tools
  const stream = createUIMessageStream({
    execute: ({ writer: dataStream }) => {
      const result = streamText({
        model: routerModel,
        messages: convertToModelMessages(uiMessages),
        stopWhen: stepCountIs(5),
        experimental_transform: smoothStream({ chunking: "word" }),
        tools: {
          createDocument: createDocument({ user, dataStream }),
          updateDocument: updateDocument({ user, dataStream }),
        },
        experimental_telemetry: {
          isEnabled: true,
          functionId: "stream-text",
        },
        onFinish: async ({ usage }) => {
          finalUsage = usage;
          dataStream.write({ type: "data-usage", data: usage });
        },
      });

      result.consumeStream();

      dataStream.merge(
        result.toUIMessageStream({
          sendReasoning: true,
        })
      );
    },
    generateId: generateUUID,
    onFinish: async ({ messages }) => {
      // Save all assistant messages
      await saveMessages({
        messages: messages.map((currentMessage) => ({
          id: currentMessage.id,
          role: currentMessage.role,
          parts: currentMessage.parts,
          createdAt: new Date(),
          attachments: [],
          chatId: id,
        })),
      });

      // Update chat usage tracking
      if (finalUsage) {
        try {
          await updateChatLastContextById({
            chatId: id,
            context: {
              promptTokens: finalUsage.promptTokens,
              completionTokens: finalUsage.completionTokens,
              totalTokens: finalUsage.totalTokens,
            },
          });
        } catch (err) {
          console.warn("Unable to persist usage for chat", id, err);
        }
      }
    },
    onError: () => {
      return "Oops, an error occurred!";
    },
  });

  // Return streaming response with proper SSE transformation
  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Not Found" }, { status: 404 });
  }

  const auth = await getAuthUser(request);

  if (!auth?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (!chat) {
      return Response.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.userId !== auth.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deleteChatById({ id });

    return Response.json({ message: "Chat deleted" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return Response.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}
