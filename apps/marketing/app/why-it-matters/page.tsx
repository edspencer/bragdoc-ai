import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { WhyItMattersHero } from '@/components/why-it-matters/hero';
import { ExpertEndorsements } from '@/components/why-it-matters/expert-endorsements';
import { PersonalStory } from '@/components/why-it-matters/personal-story';
import { TheProblem } from '@/components/why-it-matters/the-problem';
import { TheSolution } from '@/components/why-it-matters/the-solution';
import { WhyItMattersCTA } from '@/components/why-it-matters/cta';
import { TimeSavedComparison } from '@/components/time-saved/time-saved-comparison';

export const metadata: Metadata = {
  title:
    'Why Achievement Tracking Matters: The Career Impact of Brag Documents',
  description:
    'Learn why tracking achievements is crucial for career growth, performance reviews, salary negotiations, and combating imposter syndrome. Expert insights and personal stories.',
  keywords:
    'why track achievements, importance of brag documents, career development, performance review preparation',
  alternates: {
    canonical: '/why-it-matters',
  },
};

export default function WhyItMattersPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <WhyItMattersHero />
        <ExpertEndorsements />
        <TimeSavedComparison />
        <TheProblem />
        <PersonalStory />
        <TheSolution />
        <WhyItMattersCTA />
      </main>
      <Footer />
    </div>
  );
}
