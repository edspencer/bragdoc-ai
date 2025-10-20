import { Hero } from '@/components/salient/Hero';
import { PrimaryFeatures } from '@/components/salient/PrimaryFeatures';
import { SecondaryFeatures } from '@/components/salient/SecondaryFeatures';
import { CallToAction } from '@/components/salient/CallToAction';
import { Testimonials } from '@/components/salient/Testimonials';
import { Pricing } from '@/components/salient/Pricing';
import { Faqs } from '@/components/salient/Faqs';
import { SecondaryCTA } from '@/components/salient/SecondaryCTA';
import { CliFeature } from '@/components/CliFeature';

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
