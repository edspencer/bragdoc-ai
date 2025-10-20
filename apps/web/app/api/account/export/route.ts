import { type NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from 'lib/getAuthUser';
import { db } from '@/database/index';
import { achievement, company, project, document } from '@/database/schema';
import { eq } from 'drizzle-orm';
import type { ExportData } from '@/lib/export-import-schema';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth.user.id;

    // Fetch all user data in parallel
    const [companies, projects, achievements, documents] = await Promise.all([
      db.select().from(company).where(eq(company.userId, userId)),
      db.select().from(project).where(eq(project.userId, userId)),
      db.select().from(achievement).where(eq(achievement.userId, userId)),
      db.select().from(document).where(eq(document.userId, userId)),
    ]);

    // Format the export data
    const exportData: ExportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userId,
      companies: companies.map((c) => ({
        id: c.id,
        userId: c.userId,
        name: c.name,
        domain: c.domain,
        role: c.role,
        startDate: c.startDate.toISOString(),
        endDate: c.endDate?.toISOString() ?? null,
      })),
      projects: projects.map((p) => ({
        id: p.id,
        userId: p.userId,
        companyId: p.companyId,
        name: p.name,
        description: p.description,
        status: p.status,
        color: p.color,
        startDate: p.startDate.toISOString(),
        endDate: p.endDate?.toISOString() ?? null,
        repoRemoteUrl: p.repoRemoteUrl,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      achievements: achievements.map((a) => ({
        id: a.id,
        userId: a.userId,
        companyId: a.companyId,
        projectId: a.projectId,
        userMessageId: a.userMessageId,
        title: a.title,
        summary: a.summary,
        details: a.details,
        eventStart: a.eventStart?.toISOString() ?? null,
        eventEnd: a.eventEnd?.toISOString() ?? null,
        eventDuration: a.eventDuration as any,
        isArchived: a.isArchived,
        source: a.source as any,
        impact: a.impact,
        impactSource: a.impactSource as any,
        impactUpdatedAt: a.impactUpdatedAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      documents: documents.map((d) => ({
        id: d.id,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        title: d.title,
        content: d.content,
        userId: d.userId,
        companyId: d.companyId,
        type: d.type,
        shareToken: d.shareToken,
      })),
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 },
    );
  }
}
