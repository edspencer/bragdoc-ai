import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';
import { DocumentList } from 'components/documents/document-list';
import { redirect } from 'next/navigation';
import { AppPage } from 'components/shared/app-page';

export const metadata = {
  title: 'Documents - bragdoc.ai',
  description: 'Manage and share your documents.',
};

export default async function DocumentsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <AppPage title="Documents" description="Manage and share your documents">
      <DocumentList />
    </AppPage>
  );
}
