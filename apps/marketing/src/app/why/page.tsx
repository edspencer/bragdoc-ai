import { WhyHero } from '@/components/why/WhyHero';
import { WhyStats } from '@/components/why/WhyStats';
import { WhyBenefits } from '@/components/why/WhyBenefits';
import { WhyStories } from '@/components/why/WhyStories';
import { WhyProcess } from '@/components/why/WhyProcess';
import { WhyCallToAction } from '@/components/why/WhyCallToAction';
import { WhyResearch } from '@/components/why/WhyResearch';
import { WhyTestimonials } from '@/components/why/WhyTestimonials';

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
