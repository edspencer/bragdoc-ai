import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { WhyItMattersHero } from '@/components/why-it-matters/hero';
import { ExpertEndorsements } from '@/components/why-it-matters/expert-endorsements';
import { PersonalStory } from '@/components/why-it-matters/personal-story';
import { TheProblem } from '@/components/why-it-matters/the-problem';
import { TheSolution } from '@/components/why-it-matters/the-solution';
import { WhyItMattersCTA } from '@/components/why-it-matters/cta';

export default function WhyItMattersPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <WhyItMattersHero />
        <ExpertEndorsements />
        <TheProblem />
        <PersonalStory />
        <TheSolution />
        <WhyItMattersCTA />
      </main>
      <Footer />
    </div>
  );
}
