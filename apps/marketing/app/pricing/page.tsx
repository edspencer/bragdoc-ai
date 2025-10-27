import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { BetaBanner } from '@/components/pricing/beta-banner';
import { PricingHeader } from '@/components/pricing/pricing-header';
import { PricingTiers } from '@/components/pricing/pricing-tiers';
import { ComparisonTable } from '@/components/pricing/comparison-table';
import { PrivacyArchitecture } from '@/components/how-it-works/privacy-architecture';
import { PricingFaq } from '@/components/pricing/pricing-faq';
import { PricingCta } from '@/components/pricing/pricing-cta';
import { OfferSchema } from '@/components/structured-data/offer-schema';

export const metadata: Metadata = {
  title: 'BragDoc Pricing: Free Open Beta - One Year Free Offer',
  description:
    'BragDoc is in open beta with all features FREE. Sign up now and get one year free when we launch at $4.99/month. No credit card required.',
  keywords:
    'bragdoc pricing, free achievement tracker, beta pricing, developer tool pricing, free open beta',
  alternates: {
    canonical: '/pricing',
  },
};

const pricingOffers = [
  {
    name: 'Free Plan',
    price: '0',
    priceCurrency: 'USD',
    description:
      'Full CLI features with your own LLM (Ollama, OpenAI, Anthropic)',
  },
  {
    name: 'Cloud AI Plan',
    price: '4.99',
    priceCurrency: 'USD',
    description: 'Cloud-based AI document generation and advanced features',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <OfferSchema offers={pricingOffers} />
      <Header />
      <div className="pt-16">
        <BetaBanner />
      </div>
      <main>
        <PricingHeader />
        <PricingTiers />
        <PrivacyArchitecture />
        <ComparisonTable />
        <PricingFaq />
        <PricingCta />
      </main>
      <Footer />
    </div>
  );
}
