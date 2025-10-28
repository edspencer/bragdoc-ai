import { getAuthUser } from '@/lib/getAuthUser';
import { db } from '@/database/index';
import { company, project, achievement, document } from '@/database/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const authResult = await getAuthUser(request);

  if (!authResult) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = authResult.user.id;

  try {
    const [companies] = await db
      .select({ count: sql<number>`count(*)` })
      .from(company)
      .where(eq(company.userId, userId));

    const [projects] = await db
      .select({ count: sql<number>`count(*)` })
      .from(project)
      .where(eq(project.userId, userId));

    const [achievements] = await db
      .select({ count: sql<number>`count(*)` })
      .from(achievement)
      .where(eq(achievement.userId, userId));

    const [documents] = await db
      .select({ count: sql<number>`count(*)` })
      .from(document)
      .where(eq(document.userId, userId));

    return Response.json({
      companies: companies?.count || 0,
      projects: projects?.count || 0,
      achievements: achievements?.count || 0,
      documents: documents?.count || 0,
    });
  } catch (error) {
    console.error('Error fetching counts:', error);
    return Response.json({ error: 'Failed to fetch counts' }, { status: 500 });
  }
}
