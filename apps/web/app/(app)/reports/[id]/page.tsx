import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';
import { db } from '@/database/index';
import { document, company } from '@/database/schema';
import type { DocumentWithCompany } from '@bragdoc/database';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { AppPage } from 'components/shared/app-page';
import { SidebarInset } from '@/components/ui/sidebar';
import { ReportDetailView } from './report-detail-view';

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Await params (Next.js 16 async params)
  const { id } = await params;

  // Authenticate
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return <div className="p-4">Please log in.</div>;
  }

  // Fetch document with company data
  const documentData = await db
    .select({
      id: document.id,
      title: document.title,
      content: document.content,
      type: document.type,
      kind: document.kind,
      chatId: document.chatId,
      companyId: document.companyId,
      userId: document.userId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      shareToken: document.shareToken,
      company: {
        id: company.id,
        name: company.name,
      },
    })
    .from(document)
    .leftJoin(company, eq(document.companyId, company.id))
    .where(and(eq(document.id, id), eq(document.userId, session.user.id)))
    .limit(1);

  // If no document found, show 404
  if (documentData.length === 0) {
    notFound();
  }

  // Fetch user's companies for edit dialog
  const companies = await db
    .select()
    .from(company)
    .where(eq(company.userId, session.user.id));

  // Transform document data to DocumentWithCompany type
  // We know documentData[0] exists because we checked length above
  const rawDoc = documentData[0]!;
  const doc: DocumentWithCompany = {
    id: rawDoc.id,
    title: rawDoc.title,
    content: rawDoc.content,
    type: rawDoc.type,
    kind: rawDoc.kind,
    chatId: rawDoc.chatId,
    companyId: rawDoc.companyId,
    userId: rawDoc.userId,
    createdAt: rawDoc.createdAt,
    updatedAt: rawDoc.updatedAt,
    shareToken: rawDoc.shareToken,
    companyName: rawDoc.company?.name || null,
  };

  return (
    <AppPage>
      <SidebarInset>
        <ReportDetailView initialDocument={doc} companies={companies} />
      </SidebarInset>
    </AppPage>
  );
}
