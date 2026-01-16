import { AuthForm } from '@/components/auth-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const params = await searchParams;
  const isDemoFlow = params.demo === 'true';

  return <AuthForm mode="login" isDemoFlow={isDemoFlow} />;
}
