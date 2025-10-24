import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { TermsOfServiceContent } from '@/components/legal/terms-of-service';

export const metadata: Metadata = {
  title: 'Terms of Service | BragDoc',
  description:
    'BragDoc Terms of Service - Legal terms and conditions for using our achievement tracking platform.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">
        <TermsOfServiceContent />
      </main>
      <Footer />
    </>
  );
}
