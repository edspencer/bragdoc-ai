import { redirect } from 'next/navigation';
import { auth } from 'app/(auth)/auth';
import { DashboardContent } from 'components/dashboard/dashboard-content';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return <DashboardContent user={session.user} />;
}