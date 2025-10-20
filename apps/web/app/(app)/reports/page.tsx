import { auth } from 'app/(auth)/auth';
import { redirect } from 'next/navigation';
import { db } from '@/database/index';
import { document, company } from '@/database/schema';
import { eq, desc } from 'drizzle-orm';
import { ReportsTable } from './reports-table';
import { SidebarInset } from '@/components/ui/sidebar';
import { AppPage } from 'components/shared/app-page';

export default async function ReportsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Fetch documents with company data (get latest version of each document)
  const documentsData = await db
    .select({
      id: document.id,
      title: document.title,
      content: document.content,
      type: document.type,
      kind: document.kind,
      chatId: document.chatId,
      companyId: document.companyId,
      company: {
        id: company.id,
        name: company.name,
      },
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    })
    .from(document)
    .leftJoin(company, eq(document.companyId, company.id))
    .where(eq(document.userId, session.user.id))
    .orderBy(desc(document.updatedAt));

  // Transform the data to include company information
  const documents = documentsData.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    kind: row.kind,
    chatId: row.chatId,
    companyId: row.companyId,
    companyName: row.company?.name || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  // Fetch companies for filter dropdown
  const companies = await db
    .select()
    .from(company)
    .where(eq(company.userId, session.user.id));

  return (
    <AppPage>
      <SidebarInset>
        <ReportsTable initialDocuments={documents} companies={companies} />
      </SidebarInset>
    </AppPage>
  );
}
