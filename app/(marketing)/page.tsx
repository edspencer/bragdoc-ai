import { Hero } from '@/components/marketing/salient/Hero';
import { PrimaryFeatures } from '@/components/marketing/salient/PrimaryFeatures';
import { SecondaryFeatures } from '@/components/marketing/salient/SecondaryFeatures';
import { CallToAction } from '@/components/marketing/salient/CallToAction';
import { Testimonials } from '@/components/marketing/salient/Testimonials';
import { Pricing } from '@/components/marketing/salient/Pricing';
import { Faqs } from '@/components/marketing/salient/Faqs';
import { SecondaryCTA } from '@/components/marketing/salient/SecondaryCTA';
import { CliFeature } from '@/components/marketing/CliFeature';

export default function HomePage() {
  return (
    <>
      <Hero />
      <PrimaryFeatures />
      <CliFeature />
      <SecondaryFeatures />
      <CallToAction />
      <Testimonials />
      <Pricing />
      <Faqs />
      <SecondaryCTA />
    </>
  );
}
