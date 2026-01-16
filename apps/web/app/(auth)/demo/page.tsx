import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';

export const metadata: Metadata = {
  title: 'Try the Demo | BragDoc',
  description:
    'Try BragDoc with sample data. Sign in to explore the full experience.',
};

export default function DemoPage() {
  return <AuthForm mode="demo" />;
}
