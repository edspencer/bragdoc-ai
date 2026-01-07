import { and, desc, eq } from 'drizzle-orm';
import { db } from '../index';
import { performanceReview, document, type PerformanceReview } from '../schema';

export type CreatePerformanceReviewInput = {
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  instructions?: string | null;
};

export type UpdatePerformanceReviewInput = Partial<
  Omit<CreatePerformanceReviewInput, 'userId'>
>;

export type PerformanceReviewWithDocument = PerformanceReview & {
  document: { id: string; title: string } | null;
};

/**
 * Get all performance reviews for a user, ordered by createdAt descending.
 * Includes linked document title if available.
 */
export async function getPerformanceReviewsByUserId(
  userId: string,
): Promise<PerformanceReviewWithDocument[]> {
  const results = await db
    .select({
      id: performanceReview.id,
      userId: performanceReview.userId,
      name: performanceReview.name,
      startDate: performanceReview.startDate,
      endDate: performanceReview.endDate,
      instructions: performanceReview.instructions,
      documentId: performanceReview.documentId,
      createdAt: performanceReview.createdAt,
      updatedAt: performanceReview.updatedAt,
      document: {
        id: document.id,
        title: document.title,
      },
    })
    .from(performanceReview)
    .leftJoin(document, eq(performanceReview.documentId, document.id))
    .where(eq(performanceReview.userId, userId))
    .orderBy(desc(performanceReview.createdAt));

  return results.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    startDate: row.startDate,
    endDate: row.endDate,
    instructions: row.instructions,
    documentId: row.documentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    document: row.document?.id ? row.document : null,
  }));
}

/**
 * Get a single performance review by ID with userId scope for security.
 * Includes linked document title if available.
 */
export async function getPerformanceReviewById(
  id: string,
  userId: string,
): Promise<PerformanceReviewWithDocument | null> {
  const results = await db
    .select({
      id: performanceReview.id,
      userId: performanceReview.userId,
      name: performanceReview.name,
      startDate: performanceReview.startDate,
      endDate: performanceReview.endDate,
      instructions: performanceReview.instructions,
      documentId: performanceReview.documentId,
      createdAt: performanceReview.createdAt,
      updatedAt: performanceReview.updatedAt,
      document: {
        id: document.id,
        title: document.title,
      },
    })
    .from(performanceReview)
    .leftJoin(document, eq(performanceReview.documentId, document.id))
    .where(
      and(eq(performanceReview.id, id), eq(performanceReview.userId, userId)),
    );

  if (!results.length) return null;

  const row = results[0]!;
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    startDate: row.startDate,
    endDate: row.endDate,
    instructions: row.instructions,
    documentId: row.documentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    document: row.document?.id ? row.document : null,
  };
}

/**
 * Create a new performance review.
 * Returns the created record.
 */
export async function createPerformanceReview(
  input: CreatePerformanceReviewInput,
): Promise<PerformanceReview> {
  const results = await db
    .insert(performanceReview)
    .values({
      userId: input.userId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      instructions: input.instructions ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return results[0]!;
}

/**
 * Update a performance review with userId scope for security.
 * Sets updatedAt to current timestamp.
 * Returns updated record or null if not found.
 */
export async function updatePerformanceReview(
  id: string,
  userId: string,
  input: UpdatePerformanceReviewInput,
): Promise<PerformanceReview | null> {
  const results = await db
    .update(performanceReview)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(
      and(eq(performanceReview.id, id), eq(performanceReview.userId, userId)),
    )
    .returning();

  return results[0] || null;
}

/**
 * Delete a performance review with userId scope for security.
 * Returns deleted record or null if not found.
 */
export async function deletePerformanceReview(
  id: string,
  userId: string,
): Promise<PerformanceReview | null> {
  const results = await db
    .delete(performanceReview)
    .where(
      and(eq(performanceReview.id, id), eq(performanceReview.userId, userId)),
    )
    .returning();

  return results[0] || null;
}
