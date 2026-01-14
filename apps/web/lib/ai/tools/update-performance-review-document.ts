import { smoothStream, streamText, tool, type UIMessageStreamWriter } from 'ai';
import type { User } from '@bragdoc/database';
import { z } from 'zod';
import { getPerformanceReviewById, updateDocument } from '@bragdoc/database';
import { updateDocumentPrompt } from '@/lib/ai/prompts';
import { documentWritingModel } from '@/lib/ai';
import type { ChatMessage } from '@/lib/types';

type UpdatePerformanceReviewDocumentProps = {
  user: User;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const updatePerformanceReviewDocument = ({
  user,
  dataStream,
}: UpdatePerformanceReviewDocumentProps) =>
  tool({
    description:
      'Update the performance review document with the given changes.',
    inputSchema: z.object({
      performanceReviewId: z
        .string()
        .describe('The ID of the performance review to update'),
      description: z
        .string()
        .describe('Description of the changes to make to the document'),
    }),
    execute: async ({ performanceReviewId, description }) => {
      // Fetch performance review with document via LEFT JOIN
      const performanceReview = await getPerformanceReviewById(
        performanceReviewId,
        user.id,
      );

      if (!performanceReview) {
        return { error: 'Performance review not found' };
      }

      if (
        !performanceReview.document?.id ||
        !performanceReview.document?.content
      ) {
        return {
          error: 'No document found. Please generate a document first.',
        };
      }

      const document = performanceReview.document;

      // Clear existing content in the editor
      dataStream.write({ type: 'data-clear', data: null, transient: true });

      // Stream updated content
      let draftContent = '';

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

      for await (const delta of fullStream) {
        if (delta.type === 'text-delta') {
          draftContent += delta.text;
          dataStream.write({
            type: 'data-textDelta',
            data: delta.text,
            transient: true,
          });
        }
      }

      // Persist updated content to database
      await updateDocument({
        id: document.id,
        userId: user.id,
        data: { content: draftContent },
      });

      // Signal completion
      dataStream.write({ type: 'data-finish', data: null, transient: true });

      return {
        performanceReviewId,
        documentId: document.id,
        message: 'Document updated successfully.',
      };
    },
  });
