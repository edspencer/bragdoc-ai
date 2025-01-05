import { auth } from '@/app/(auth)/auth';
import { DocumentList } from '@/components/documents/document-list';
import { redirect } from 'next/navigation';

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
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Documents</h2>
      </div>
      <div className="h-full flex-1 flex-col space-y-8 md:flex">
        <DocumentList />
      </div>
    </div>
  );
}
