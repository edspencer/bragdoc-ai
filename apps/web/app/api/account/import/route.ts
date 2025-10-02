import { type NextRequest, NextResponse } from 'next/server';
import { auth } from 'app/(auth)/auth';
import { db } from '@/database/index';
import { achievement, company, project, document } from '@/database/schema';
import { eq, and } from 'drizzle-orm';
import { exportDataSchema } from '@/lib/export-import-schema';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();

    // Validate the import data
    const result = exportDataSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Invalid import data format',
          details: result.error.errors,
        },
        { status: 400 },
      );
    }

    const importData = result.data;

    // Track what was imported
    const stats = {
      companies: { created: 0, skipped: 0 },
      projects: { created: 0, skipped: 0 },
      achievements: { created: 0, skipped: 0 },
      documents: { created: 0, skipped: 0 },
    };

    // Import companies (check for duplicates by id)
    for (const companyData of importData.companies) {
      const existing = await db
        .select()
        .from(company)
        .where(and(eq(company.id, companyData.id), eq(company.userId, userId)));

      if (existing.length === 0) {
        await db.insert(company).values({
          id: companyData.id,
          userId, // Override with current user's id
          name: companyData.name,
          domain: companyData.domain,
          role: companyData.role,
          startDate: new Date(companyData.startDate),
          endDate: companyData.endDate ? new Date(companyData.endDate) : null,
        });
        stats.companies.created++;
      } else {
        stats.companies.skipped++;
      }
    }

    // Import projects (check for duplicates by id)
    for (const projectData of importData.projects) {
      const existing = await db
        .select()
        .from(project)
        .where(and(eq(project.id, projectData.id), eq(project.userId, userId)));

      if (existing.length === 0) {
        await db.insert(project).values({
          id: projectData.id,
          userId, // Override with current user's id
          companyId: projectData.companyId,
          name: projectData.name,
          description: projectData.description,
          status: projectData.status,
          color: projectData.color,
          startDate: new Date(projectData.startDate),
          endDate: projectData.endDate ? new Date(projectData.endDate) : null,
          repoRemoteUrl: projectData.repoRemoteUrl,
          createdAt: new Date(projectData.createdAt),
          updatedAt: new Date(projectData.updatedAt),
        });
        stats.projects.created++;
      } else {
        stats.projects.skipped++;
      }
    }

    // Import achievements (check for duplicates by id)
    for (const achievementData of importData.achievements) {
      const existing = await db
        .select()
        .from(achievement)
        .where(
          and(
            eq(achievement.id, achievementData.id),
            eq(achievement.userId, userId),
          ),
        );

      if (existing.length === 0) {
        await db.insert(achievement).values({
          id: achievementData.id,
          userId, // Override with current user's id
          companyId: achievementData.companyId,
          projectId: achievementData.projectId,
          userMessageId: achievementData.userMessageId,
          title: achievementData.title,
          summary: achievementData.summary,
          details: achievementData.details,
          eventStart: achievementData.eventStart
            ? new Date(achievementData.eventStart)
            : null,
          eventEnd: achievementData.eventEnd
            ? new Date(achievementData.eventEnd)
            : null,
          eventDuration: achievementData.eventDuration,
          isArchived: achievementData.isArchived ?? false,
          source: achievementData.source,
          impact: achievementData.impact,
          impactSource: achievementData.impactSource ?? 'user',
          impactUpdatedAt: achievementData.impactUpdatedAt
            ? new Date(achievementData.impactUpdatedAt)
            : new Date(),
          createdAt: new Date(achievementData.createdAt),
          updatedAt: new Date(achievementData.updatedAt),
        });
        stats.achievements.created++;
      } else {
        stats.achievements.skipped++;
      }
    }

    // Import documents (check for duplicates by id)
    for (const documentData of importData.documents) {
      const existing = await db
        .select()
        .from(document)
        .where(
          and(eq(document.id, documentData.id), eq(document.userId, userId)),
        );

      if (existing.length === 0) {
        await db.insert(document).values({
          id: documentData.id,
          userId, // Override with current user's id
          companyId: documentData.companyId,
          title: documentData.title,
          content: documentData.content,
          type: documentData.type,
          shareToken: documentData.shareToken,
          createdAt: new Date(documentData.createdAt),
          updatedAt: new Date(documentData.updatedAt),
        });
        stats.documents.created++;
      } else {
        stats.documents.skipped++;
      }
    }

    return NextResponse.json({
      message: 'Data imported successfully',
      stats,
    });
  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'Failed to import data' },
      { status: 500 },
    );
  }
}
