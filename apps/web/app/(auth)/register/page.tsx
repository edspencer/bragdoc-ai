import { AuthForm } from '@/components/auth-form';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const params = await searchParams;
  const isDemoFlow = params.demo === 'true';

  return <AuthForm mode="register" isDemoFlow={isDemoFlow} />;
}
