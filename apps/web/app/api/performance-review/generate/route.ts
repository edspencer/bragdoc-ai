import { getAuthUser } from '@/lib/getAuthUser';
import { streamText } from 'ai';
import { documentWritingModel } from '@/lib/ai';
import {
  getPerformanceReviewById,
  getWorkstreamsByUserIdWithDateFilter,
  getAchievementsByDateRange,
  saveDocument,
  saveChat,
  updatePerformanceReview,
} from '@bragdoc/database';
import { z } from 'zod/v3';
import { generateUUID } from '@/lib/utils';
import { format } from 'date-fns';
import { hasUnlimitedAccess } from '@/lib/stripe/subscription';
import {
  checkUserCredits,
  deductCredits,
  CREDIT_COSTS,
  logCreditTransaction,
} from '@/lib/credits';

export const maxDuration = 60;

const generateSchema = z.object({
  performanceReviewId: z.string().uuid(),
  generationInstructions: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // Authenticate user
    const auth = await getAuthUser(request);

    if (!auth?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = generateSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        {
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { performanceReviewId, generationInstructions } = parseResult.data;

    // Credit gate - skip for paid/demo users
    if (!hasUnlimitedAccess(auth.user)) {
      const cost = CREDIT_COSTS.document_generation.performance_review; // 2 credits
      const { hasCredits, remainingCredits } = checkUserCredits(
        auth.user,
        cost,
      );

      if (!hasCredits) {
        return Response.json(
          {
            error: 'insufficient_credits',
            message: `Performance review generation requires ${cost} credits. You have ${remainingCredits} remaining.`,
            required: cost,
            available: remainingCredits,
            upgradeUrl: '/pricing',
          },
          { status: 402 },
        );
      }

      // Atomic deduction
      const { success } = await deductCredits(auth.user.id, cost);
      if (!success) {
        return Response.json(
          {
            error: 'insufficient_credits',
            message:
              'Credits consumed by concurrent request. Please try again.',
            upgradeUrl: '/pricing',
          },
          { status: 402 },
        );
      }

      // Log the transaction (non-blocking)
      logCreditTransaction({
        userId: auth.user.id,
        operation: 'deduct',
        featureType: 'document_generation',
        amount: cost,
        metadata: { documentType: 'performance_review', performanceReviewId },
      }).catch((err) =>
        console.error('Failed to log credit transaction:', err),
      );
    }

    // Fetch the performance review with userId scope for security
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

    // Fetch achievements and workstreams in parallel
    const [achievements, workstreams] = await Promise.all([
      getAchievementsByDateRange(
        auth.user.id,
        performanceReview.startDate,
        performanceReview.endDate,
      ),
      getWorkstreamsByUserIdWithDateFilter(
        auth.user.id,
        performanceReview.startDate,
        performanceReview.endDate,
      ),
    ]);

    // Build achievements context for the prompt
    const achievementsContext =
      achievements.length > 0
        ? achievements
            .map((a, index) => {
              const parts = [`${index + 1}. **${a.title}**`];
              if (a.eventStart) {
                parts.push(
                  `   - Date: ${format(a.eventStart, 'MMMM d, yyyy')}`,
                );
              }
              if (a.projectName) {
                parts.push(`   - Project: ${a.projectName}`);
              }
              if (a.companyName) {
                parts.push(`   - Company: ${a.companyName}`);
              }
              if (a.summary) {
                parts.push(`   - Summary: ${a.summary}`);
              }
              if (a.details) {
                parts.push(`   - Details: ${a.details}`);
              }
              if (a.impact !== null && a.impact !== undefined) {
                parts.push(`   - Impact Score: ${a.impact}/10`);
              }
              return parts.join('\n');
            })
            .join('\n\n')
        : 'No achievements recorded for this review period.';

    // Build workstreams context for the prompt
    const workstreamsContext =
      workstreams.length > 0
        ? workstreams
            .map(
              (ws) =>
                `- **${ws.name}**: ${ws.achievementCount ?? 0} achievement(s)${ws.description ? ` - ${ws.description}` : ''}`,
            )
            .join('\n')
        : 'No workstreams identified for this review period.';

    // Build the comprehensive system prompt
    const systemPrompt = `You are an expert performance review writer helping professionals document their accomplishments and impact. Your goal is to create a compelling, professional performance review document that highlights achievements and demonstrates value.

## Review Period
${format(performanceReview.startDate, 'MMMM d, yyyy')} to ${format(performanceReview.endDate, 'MMMM d, yyyy')}

## Review Title
${performanceReview.name}

## Achievements (${achievements.length} total)
${achievementsContext}

## Workstreams (${workstreams.length} total)
${workstreamsContext}

## Output Requirements
Generate a professional performance review document in markdown format with the following structure:

1. **Executive Summary** - A 2-3 sentence overview of accomplishments and impact during this review period

2. **Key Accomplishments** - Group achievements by workstream or theme when applicable:
   - Highlight the most impactful achievements
   - Include specific dates and concrete details
   - Quantify impact where data is available (impact scores, metrics mentioned in details)

3. **Impact & Results** - Summarize the measurable outcomes and value delivered:
   - Reference specific projects and their outcomes
   - Connect achievements to business impact
   - Include any metrics or numbers from the achievement details

4. **Skills & Growth** - Based on the types of achievements, identify:
   - Technical skills demonstrated
   - Leadership or collaboration examples
   - Problem-solving capabilities

5. **Looking Forward** (optional) - Brief section if patterns suggest growth areas or future focus

## Writing Guidelines
- Use professional, confident language
- Be specific with dates, project names, and concrete details from the achievements
- Leverage workstream groupings to create narrative flow
- Keep the document concise but comprehensive (aim for 500-1000 words)
- Use bullet points for lists and clear headings for sections
- Write in first person where appropriate for self-assessments
- Output valid markdown with proper headings (##, ###), bullet points, and formatting
- But do not start with \`\`\`markdown\`\`\` or \`\`\`md\`\`\` or \`\`\`markdown\`\`\`\n - the entire document should be valid markdown
${generationInstructions ? `\n## IMPORTANT: User's Custom Instructions\nThe user has provided the following instructions that MUST be followed. These take priority over the default guidelines above:\n\n${generationInstructions}` : ''}`;

    // Generate UUIDs for both chat and document before streaming starts
    const chatId = generateUUID();
    const documentId = generateUUID();

    // Stream the response using the document writing model (GPT-4o)
    const result = streamText({
      model: documentWritingModel,
      prompt: systemPrompt,
      onFinish: async ({ text }) => {
        try {
          // Create the chat first
          await saveChat({
            id: chatId,
            userId: auth.user.id,
            title: `Chat for: ${performanceReview.name}`,
          });

          // Save the generated document to the database with chatId
          await saveDocument({
            id: documentId,
            title: performanceReview.name,
            content: text,
            userId: auth.user.id,
            type: 'performance_review',
            chatId,
          });

          // Update the performance review with the documentId link
          await updatePerformanceReview(performanceReviewId, auth.user.id, {
            documentId,
          });
        } catch (error) {
          // Document is already streamed to user, so just log the error
          console.error('Error saving generated document:', error);
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in performance review generate:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
