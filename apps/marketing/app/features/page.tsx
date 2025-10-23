import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { FeaturesPageClient } from '@/components/features-page-client';

export const metadata: Metadata = {
  title: 'BragDoc Features: Git-Powered Achievement Tracking & AI Reports',
  description:
    'Explore BragDoc features: automatic git commit extraction, AI-powered achievement tracking, standup mode, manager reports, and privacy-first architecture. Free CLI tools included.',
  keywords:
    'git achievement tracking, CLI achievement extraction, AI performance reports, standup automation, developer productivity',
  alternates: {
    canonical: '/features',
  },
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <FeaturesPageClient />
      <Footer />
    </div>
  );
}
