import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PricingHeader } from '@/components/pricing/pricing-header';
import { PricingTiers } from '@/components/pricing/pricing-tiers';
import { ComparisonTable } from '@/components/pricing/comparison-table';
import { PrivacyArchitecture } from '@/components/how-it-works/privacy-architecture';
import { PricingFaq } from '@/components/pricing/pricing-faq';
import { PricingCta } from '@/components/pricing/pricing-cta';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
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
