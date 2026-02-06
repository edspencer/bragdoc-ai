import { tool, type UIMessageStreamWriter } from 'ai';
import type { User } from '@bragdoc/database';
import { z } from 'zod';
import { documentHandlersByArtifactKind } from '@/lib/artifacts/server';
import { getDocumentById } from '@bragdoc/database';
import type { ChatMessage } from '@/lib/types';
import {
  checkUserCredits,
  deductCredits,
  logCreditTransaction,
  CREDIT_COSTS,
} from '@/lib/credits';

type UpdateDocumentProps = {
  user: User;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const updateDocument = ({ user, dataStream }: UpdateDocumentProps) =>
  tool({
    description: 'Update a document with the given description.',
    inputSchema: z.object({
      id: z.string().describe('The ID of the document to update'),
      description: z
        .string()
        .describe('The description of changes that need to be made'),
    }),
    execute: async ({ id, description }) => {
      const document = await getDocumentById({ id });

      if (!document) {
        return {
          error: 'Document not found',
        };
      }

      dataStream.write({
        type: 'data-clear',
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === document.kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${document.kind}`);
      }

      await documentHandler.onUpdateDocument({
        document,
        description,
        dataStream,
        user,
      });

      dataStream.write({ type: 'data-finish', data: null, transient: true });

      return {
        id,
        title: document.title,
        kind: document.kind,
        content: 'The document has been updated successfully.',
      };
    },
  });

/**
 * Update document tool with credit checking for free users.
 * Deducts credits before executing the tool.
 */
export const updateDocumentWithCreditCheck = ({
  user,
  dataStream,
}: UpdateDocumentProps) =>
  tool({
    description: 'Update a document with the given description.',
    inputSchema: z.object({
      id: z.string().describe('The ID of the document to update'),
      description: z
        .string()
        .describe('The description of changes that need to be made'),
    }),
    execute: async ({ id, description }) => {
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
        metadata: { toolName: 'updateDocument' },
      }).catch((err) =>
        console.error('Failed to log tool credit transaction:', err),
      );

      // Execute actual tool logic
      const document = await getDocumentById({ id });

      if (!document) {
        return {
          error: 'Document not found',
        };
      }

      dataStream.write({
        type: 'data-clear',
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === document.kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${document.kind}`);
      }

      await documentHandler.onUpdateDocument({
        document,
        description,
        dataStream,
        user,
      });

      dataStream.write({ type: 'data-finish', data: null, transient: true });

      return {
        id,
        title: document.title,
        kind: document.kind,
        content: 'The document has been updated successfully.',
      };
    },
  });
