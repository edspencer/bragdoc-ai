import { z } from 'zod';
import type { ExtractedBrag } from '../ai/extract';

export interface StreamingBragChunk {
  type: 'brag';
  data: ExtractedBrag;
}

export interface StreamingStatusChunk {
  type: 'status';
  data: {
    message: string;
    progress?: number;
  };
}

export type StreamingChunk = StreamingBragChunk | StreamingStatusChunk;

export const streamingBragSchema = z.object({
  type: z.literal('brag'),
  data: z.object({
    title: z.string(),
    summary: z.string(),
    details: z.string(),
    eventDuration: z.enum(['day', 'week', 'month', 'quarter', 'half year', 'year']),
    companyId: z.string().nullable(),
    projectId: z.string().nullable(),
    suggestNewProject: z.boolean().optional(),
  }),
});

export const streamingStatusSchema = z.object({
  type: z.literal('status'),
  data: z.object({
    message: z.string(),
    progress: z.number().optional(),
  }),
});

export const streamingChunkSchema = z.discriminatedUnion('type', [
  streamingBragSchema,
  streamingStatusSchema,
]);
