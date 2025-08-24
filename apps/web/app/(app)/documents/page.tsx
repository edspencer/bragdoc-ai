import { auth } from 'app/(auth)/auth';
import { DocumentList } from 'components/documents/document-list';
import { redirect } from 'next/navigation';
import { AppPage } from 'components/shared/app-page';

export const metadata = {
  title: 'Documents - bragdoc.ai',
  description: 'Manage and share your documents.',
};

export default async function DocumentsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <AppPage title="Documents" description="Manage and share your documents">
      <DocumentList />
    </AppPage>
  );
}
