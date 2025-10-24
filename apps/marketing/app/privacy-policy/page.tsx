import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PrivacyPolicyContent } from '@/components/legal/privacy-policy';

export const metadata: Metadata = {
  title: 'Privacy Policy | BragDoc',
  description:
    'BragDoc Privacy Policy - How we collect, use, and protect your data. Learn about our GDPR-compliant, cookieless analytics and data protection practices.',
  alternates: {
    canonical: '/privacy-policy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">
        <PrivacyPolicyContent />
      </main>
      <Footer />
    </>
  );
}
