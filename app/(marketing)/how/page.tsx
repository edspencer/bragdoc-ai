import { HowHero } from '@/components/marketing/how/HowHero';
import { HowFeatures } from '@/components/marketing/how/HowFeatures';
import { HowDemo } from '@/components/marketing/how/HowDemo';
import { HowIntegrations } from '@/components/marketing/how/HowIntegrations';
import { HowAI } from '@/components/marketing/how/HowAI';
import { HowTemplates } from '@/components/marketing/how/HowTemplates';
import { HowTestimonials } from '@/components/marketing/how/HowTestimonials';
import { HowCallToAction } from '@/components/marketing/how/HowCallToAction';

export default function HowPage() {
  return (
    <>
      <HowHero />
      <HowFeatures />
      <HowDemo />
      <HowIntegrations />
      <HowAI />
      <HowTemplates />
      <HowTestimonials />
      <HowCallToAction />
    </>
  );
}
