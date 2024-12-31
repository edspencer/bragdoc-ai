import { WhyHero } from '@/components/marketing/why/WhyHero';
import { WhyStats } from '@/components/marketing/why/WhyStats';
import { WhyBenefits } from '@/components/marketing/why/WhyBenefits';
import { WhyStories } from '@/components/marketing/why/WhyStories';
import { WhyProcess } from '@/components/marketing/why/WhyProcess';
import { WhyCallToAction } from '@/components/marketing/why/WhyCallToAction';
import { WhyResearch } from '@/components/marketing/why/WhyResearch';
import { WhyTestimonials } from '@/components/marketing/why/WhyTestimonials';

export default function WhyPage() {
  return (
    <>
      <WhyHero />
      <WhyStats />
      <WhyBenefits />
      <WhyStories />
      <WhyProcess />
      <WhyResearch />
      <WhyTestimonials />
      <WhyCallToAction />
    </>
  );
}
