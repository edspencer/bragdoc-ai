import { getAuthUser } from '@/lib/getAuthUser';
import { streamText, convertToModelMessages } from 'ai';
import type { UIMessage } from 'ai';
import { routerModel } from '@/lib/ai';
import {
  getPerformanceReviewById,
  getWorkstreamsByUserIdWithDateFilter,
} from '@bragdoc/database';
import { format } from 'date-fns';

export const maxDuration = 60;

interface RequestBody {
  messages: UIMessage[];
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

    // Parse request body
    const body = (await request.json()) as RequestBody;
    const { messages, generationInstructions, performanceReviewId } = body;

    // Validate performanceReviewId
    if (!performanceReviewId) {
      return Response.json(
        { error: 'performanceReviewId is required' },
        { status: 400 },
      );
    }

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: 'Messages array is required and cannot be empty' },
        { status: 400 },
      );
    }

    // Fetch the performance review to get the date range
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

    const systemPrompt = `You are an AI assistant helping users generate and refine performance review documents.

The user is creating a performance review document for the period ${format(performanceReview.startDate, 'MMMM d, yyyy')} to ${format(performanceReview.endDate, 'MMMM d, yyyy')}.

Their work has been organized into the following workstreams:

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
