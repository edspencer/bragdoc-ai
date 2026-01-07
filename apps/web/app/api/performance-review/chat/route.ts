import { getAuthUser } from '@/lib/getAuthUser';
import { streamText, convertToModelMessages } from 'ai';
import type { UIMessage } from 'ai';
import { routerModel } from '@/lib/ai';
import { fakeWorkstreams } from '@/lib/performance-review-fake-data';
import { format } from 'date-fns';

export const maxDuration = 60;

interface RequestBody {
  messages: UIMessage[];
  generationInstructions?: string;
}

export async function POST(request: Request) {
  try {
    // Authenticate user
    const auth = await getAuthUser(request);

    if (!auth?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = (await request.json()) as RequestBody;
    const { messages, generationInstructions } = body;

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: 'Messages array is required and cannot be empty' },
        { status: 400 },
      );
    }

    // Build system prompt with workstreams context
    const workstreamsContext = fakeWorkstreams
      .map(
        (ws) =>
          `- ${ws.name}: ${ws.achievementCount} achievements from ${format(ws.startDate, 'MMM yyyy')} to ${format(ws.endDate, 'MMM yyyy')}`,
      )
      .join('\n');

    const systemPrompt = `You are an AI assistant helping users generate and refine performance review documents.

The user is creating a performance review document based on their work achievements. Their work has been organized into the following workstreams:

${workstreamsContext}

User's generation instructions:
${generationInstructions || 'No specific instructions provided.'}

Help the user generate, refine, or improve their performance review document. Be concise and professional.`;

    // Convert UI messages to model messages and stream the response
    const result = streamText({
      model: routerModel,
      system: systemPrompt,
      messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in performance review chat:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
