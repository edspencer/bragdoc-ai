import { tool, type UIMessageStreamWriter } from 'ai';
import type { User } from '@bragdoc/database';
import { z } from 'zod';
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from '@/lib/artifacts/server';
import type { ChatMessage } from '@/lib/types';
import { generateUUID } from '@/lib/utils';
import {
  checkUserCredits,
  deductCredits,
  logCreditTransaction,
  CREDIT_COSTS,
} from '@/lib/credits';

type CreateDocumentProps = {
  user: User;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const createDocument = ({ user, dataStream }: CreateDocumentProps) =>
  tool({
    description:
      'Create a document for a writing or content creation activities. This tool will call other functions that will generate the contents of the document based on the title and kind.',
    inputSchema: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
    }),
    execute: async ({ title, kind }) => {
      const id = generateUUID();

      dataStream.write({
        type: 'data-kind',
        data: kind,
        transient: true,
      });

      dataStream.write({
        type: 'data-id',
        data: id,
        transient: true,
      });

      dataStream.write({
        type: 'data-title',
        data: title,
        transient: true,
      });

      dataStream.write({
        type: 'data-clear',
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        dataStream,
        user,
      });

      dataStream.write({ type: 'data-finish', data: null, transient: true });

      return {
        id,
        title,
        kind,
        content: 'A document was created and is now visible to the user.',
      };
    },
  });

/**
 * Create document tool with credit checking for free users.
 * Deducts credits before executing the tool.
 */
export const createDocumentWithCreditCheck = ({
  user,
  dataStream,
}: CreateDocumentProps) =>
  tool({
    description:
      'Create a document for a writing or content creation activities. This tool will call other functions that will generate the contents of the document based on the title and kind.',
    inputSchema: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
    }),
    execute: async ({ title, kind }) => {
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
        metadata: { toolName: 'createDocument' },
      }).catch((err) =>
        console.error('Failed to log tool credit transaction:', err),
      );

      // Execute the actual tool logic
      const id = generateUUID();

      dataStream.write({
        type: 'data-kind',
        data: kind,
        transient: true,
      });

      dataStream.write({
        type: 'data-id',
        data: id,
        transient: true,
      });

      dataStream.write({
        type: 'data-title',
        data: title,
        transient: true,
      });

      dataStream.write({
        type: 'data-clear',
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        dataStream,
        user,
      });

      dataStream.write({ type: 'data-finish', data: null, transient: true });

      return {
        id,
        title,
        kind,
        content: 'A document was created and is now visible to the user.',
      };
    },
  });
