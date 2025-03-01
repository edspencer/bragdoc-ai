import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { company, project, achievement, document } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

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
      companies: companies.count,
      projects: projects.count,
      achievements: achievements.count,
      documents: documents.count,
    });
  } catch (error) {
    console.error('Error fetching counts:', error);
    return Response.json(
      { error: 'Failed to fetch counts' },
      { status: 500 },
    );
  }
}
