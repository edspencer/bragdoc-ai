import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const params = await searchParams;
  const isDemoFlow = params.demo === 'true';

  return <LoginForm isDemoFlow={isDemoFlow} />;
}
