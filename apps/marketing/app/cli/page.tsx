import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { CliDocumentation } from '@/components/cli-documentation';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: 'CLI Documentation - BragDoc',
  description:
    'Complete command reference and configuration guide for the BragDoc CLI',
};

export default function CliPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <CliDocumentation />
      </main>
      <Footer />
    </div>
  );
}
