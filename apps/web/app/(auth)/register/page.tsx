import { RegisterForm } from './register-form';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const params = await searchParams;
  const isDemoFlow = params.demo === 'true';

  return <RegisterForm isDemoFlow={isDemoFlow} />;
}
