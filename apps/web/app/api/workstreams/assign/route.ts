import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/getAuthUser';
import { db, achievement } from '@bragdoc/database';
import { eq, and } from 'drizzle-orm';
import { onAchievementWorkstreamChange } from '@/lib/ai/workstreams';

// Validation schema for assignment request
const assignSchema = z.object({
  achievementId: z.string().uuid(),
  workstreamId: z.string().uuid().nullable(), // null = unassign
});

type AssignRequest = z.infer<typeof assignSchema>;

/**
 * POST /api/workstreams/assign
 *
 * Manually assigns an achievement to a workstream or unassigns it.
 * Updates workstream centroids after assignment.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuthUser(request);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth.user.id;

    // Validate request body
    const body = await request.json();
    let validatedData: AssignRequest;
    try {
      validatedData = assignSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation Error', details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    // Fetch achievement and verify ownership
    const achievements = await db
      .select()
      .from(achievement)
      .where(
        and(
          eq(achievement.id, validatedData.achievementId),
          eq(achievement.userId, userId),
        ),
      );

    const ach = achievements[0];
    if (!ach) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 },
      );
    }

    // Store old workstream ID
    const oldWorkstreamId = ach.workstreamId;

    // Update achievement with new workstream ID
    // Set workstreamSource to 'user' to mark as manually assigned
    await db
      .update(achievement)
      .set({
        workstreamId: validatedData.workstreamId,
        workstreamSource: validatedData.workstreamId ? 'user' : null,
        updatedAt: new Date(),
      })
      .where(eq(achievement.id, validatedData.achievementId));

    // Update centroids for both old and new workstreams
    await onAchievementWorkstreamChange(
      validatedData.achievementId,
      oldWorkstreamId,
      validatedData.workstreamId,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error assigning workstream:', error);
    return NextResponse.json(
      { error: 'Failed to assign workstream' },
      { status: 500 },
    );
  }
}
