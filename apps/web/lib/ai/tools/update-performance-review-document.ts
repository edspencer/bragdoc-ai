import { smoothStream, streamText, tool, type UIMessageStreamWriter } from 'ai';
import type { User } from '@bragdoc/database';
import { z } from 'zod';
import { getPerformanceReviewById, updateDocument } from '@bragdoc/database';
import { updateDocumentPrompt } from '@/lib/ai/prompts';
import { documentWritingModel } from '@/lib/ai';
import type { ChatMessage } from '@/lib/types';
import {
  checkUserCredits,
  deductCredits,
  logCreditTransaction,
  CREDIT_COSTS,
} from '@/lib/credits';

type UpdatePerformanceReviewDocumentProps = {
  user: User;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  performanceReviewId: string;
};

export const updatePerformanceReviewDocument = ({
  user,
  dataStream,
  performanceReviewId,
}: UpdatePerformanceReviewDocumentProps) =>
  tool({
    description:
      'Update the performance review document with the given changes.',
    inputSchema: z.object({
      description: z
        .string()
        .describe('Description of the changes to make to the document'),
    }),
    execute: async ({ description }) => {
      console.log('[updatePerformanceReviewDocument] Tool called with:', {
        performanceReviewId,
        description: `${description?.substring(0, 100)}...`,
        userId: user.id,
      });

      // Fetch performance review with document via LEFT JOIN
      const performanceReview = await getPerformanceReviewById(
        performanceReviewId,
        user.id,
      );

      console.log(
        '[updatePerformanceReviewDocument] Fetched performance review:',
        {
          found: !!performanceReview,
          hasDocument: !!performanceReview?.document,
          documentId: performanceReview?.document?.id,
          contentLength: performanceReview?.document?.content?.length,
        },
      );

      if (!performanceReview) {
        console.log(
          '[updatePerformanceReviewDocument] ERROR: Performance review not found',
        );
        return { error: 'Performance review not found' };
      }

      if (
        !performanceReview.document?.id ||
        !performanceReview.document?.content
      ) {
        console.log(
          '[updatePerformanceReviewDocument] ERROR: No document found',
        );
        return {
          error: 'No document found. Please generate a document first.',
        };
      }

      const document = performanceReview.document;

      // Clear existing content in the editor
      console.log(
        '[updatePerformanceReviewDocument] Writing data-clear to stream',
      );
      dataStream.write({ type: 'data-clear', data: null, transient: true });

      // Stream updated content
      let draftContent = '';

      console.log(
        '[updatePerformanceReviewDocument] Starting streamText with:',
        {
          model: documentWritingModel,
          promptLength: description?.length,
          existingContentLength: document.content?.length,
        },
      );

      const { fullStream } = streamText({
        model: documentWritingModel,
        system: updateDocumentPrompt(document.content, 'text'),
        experimental_transform: smoothStream({ chunking: 'word' }),
        prompt: description,
        providerOptions: {
          openai: {
            prediction: {
              type: 'content',
              content: document.content,
            },
          },
        },
      });

      console.log('[updatePerformanceReviewDocument] Consuming stream...');
      let deltaCount = 0;

      for await (const delta of fullStream) {
        if (delta.type === 'text-delta') {
          deltaCount++;
          draftContent += delta.text;
          dataStream.write({
            type: 'data-textDelta',
            data: delta.text,
            transient: true,
          });
        }
      }

      console.log('[updatePerformanceReviewDocument] Stream complete:', {
        deltaCount,
        draftContentLength: draftContent.length,
      });

      // Persist updated content to database
      console.log(
        '[updatePerformanceReviewDocument] Persisting to database...',
      );
      await updateDocument({
        id: document.id,
        userId: user.id,
        data: { content: draftContent },
      });
      console.log('[updatePerformanceReviewDocument] Database update complete');

      // Signal completion
      console.log(
        '[updatePerformanceReviewDocument] Writing data-finish to stream',
      );
      dataStream.write({ type: 'data-finish', data: null, transient: true });

      console.log('[updatePerformanceReviewDocument] Tool execution complete');
      return {
        performanceReviewId,
        documentId: document.id,
        message: 'Document updated successfully.',
      };
    },
  });

/**
 * Update performance review document tool with credit checking for free users.
 * Deducts credits before executing the tool.
 */
export const updatePerformanceReviewDocumentWithCreditCheck = ({
  user,
  dataStream,
  performanceReviewId,
}: UpdatePerformanceReviewDocumentProps) =>
  tool({
    description:
      'Update the performance review document with the given changes.',
    inputSchema: z.object({
      description: z
        .string()
        .describe('Description of the changes to make to the document'),
    }),
    execute: async ({ description }) => {
      // Credit check for free users
      const cost = CREDIT_COSTS.chat_tool_call;
      const { hasCredits, remainingCredits } = checkUserCredits(user, cost);

      if (!hasCredits) {
        return {
          error: 'insufficient_credits',
          message: `This action requires ${cost} credit. You have ${remainingCredits} remaining. Upgrade for unlimited access.`,
        };
      }

      const { success } = await deductCredits(user.id, cost);
      if (!success) {
        return {
          error: 'insufficient_credits',
          message: 'Unable to complete action. Please try again.',
        };
      }

      // Log credit usage (non-blocking)
      logCreditTransaction({
        userId: user.id,
        operation: 'deduct',
        featureType: 'chat_tool_call',
        amount: cost,
        metadata: { toolName: 'updatePerformanceReviewDocument' },
      }).catch((err) =>
        console.error('Failed to log tool credit transaction:', err),
      );

      // Execute actual tool logic
      console.log('[updatePerformanceReviewDocument] Tool called with:', {
        performanceReviewId,
        description: `${description?.substring(0, 100)}...`,
        userId: user.id,
      });

      // Fetch performance review with document via LEFT JOIN
      const performanceReview = await getPerformanceReviewById(
        performanceReviewId,
        user.id,
      );

      console.log(
        '[updatePerformanceReviewDocument] Fetched performance review:',
        {
          found: !!performanceReview,
          hasDocument: !!performanceReview?.document,
          documentId: performanceReview?.document?.id,
          contentLength: performanceReview?.document?.content?.length,
        },
      );

      if (!performanceReview) {
        console.log(
          '[updatePerformanceReviewDocument] ERROR: Performance review not found',
        );
        return { error: 'Performance review not found' };
      }

      if (
        !performanceReview.document?.id ||
        !performanceReview.document?.content
      ) {
        console.log(
          '[updatePerformanceReviewDocument] ERROR: No document found',
        );
        return {
          error: 'No document found. Please generate a document first.',
        };
      }

      const document = performanceReview.document;

      // Clear existing content in the editor
      console.log(
        '[updatePerformanceReviewDocument] Writing data-clear to stream',
      );
      dataStream.write({ type: 'data-clear', data: null, transient: true });

      // Stream updated content
      let draftContent = '';

      console.log(
        '[updatePerformanceReviewDocument] Starting streamText with:',
        {
          model: documentWritingModel,
          promptLength: description?.length,
          existingContentLength: document.content?.length,
        },
      );

      const { fullStream } = streamText({
        model: documentWritingModel,
        system: updateDocumentPrompt(document.content, 'text'),
        experimental_transform: smoothStream({ chunking: 'word' }),
        prompt: description,
        providerOptions: {
          openai: {
            prediction: {
              type: 'content',
              content: document.content,
            },
          },
        },
      });

      console.log('[updatePerformanceReviewDocument] Consuming stream...');
      let deltaCount = 0;

      for await (const delta of fullStream) {
        if (delta.type === 'text-delta') {
          deltaCount++;
          draftContent += delta.text;
          dataStream.write({
            type: 'data-textDelta',
            data: delta.text,
            transient: true,
          });
        }
      }

      console.log('[updatePerformanceReviewDocument] Stream complete:', {
        deltaCount,
        draftContentLength: draftContent.length,
      });

      // Persist updated content to database
      console.log(
        '[updatePerformanceReviewDocument] Persisting to database...',
      );
      await updateDocument({
        id: document.id,
        userId: user.id,
        data: { content: draftContent },
      });
      console.log('[updatePerformanceReviewDocument] Database update complete');

      // Signal completion
      console.log(
        '[updatePerformanceReviewDocument] Writing data-finish to stream',
      );
      dataStream.write({ type: 'data-finish', data: null, transient: true });

      console.log('[updatePerformanceReviewDocument] Tool execution complete');
      return {
        performanceReviewId,
        documentId: document.id,
        message: 'Document updated successfully.',
      };
    },
  });
