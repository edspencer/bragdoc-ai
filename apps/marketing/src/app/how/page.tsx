import { HowHero } from '@/components/how/HowHero';
import { HowFeatures } from '@/components/how/HowFeatures';
import { HowDemo } from '@/components/how/HowDemo';
import { HowAI } from '@/components/how/HowAI';
import { HowTemplates } from '@/components/how/HowTemplates';
import { HowTestimonials } from '@/components/how/HowTestimonials';
import { HowCallToAction } from '@/components/how/HowCallToAction';

export default function HowPage() {
  return (
    <>
      <HowHero />
      <HowFeatures />
      <HowDemo />
      {/* <HowIntegrations /> */}
      <HowAI />
      <HowTemplates />
      <HowTestimonials />
      <HowCallToAction />
    </>
  );
}
