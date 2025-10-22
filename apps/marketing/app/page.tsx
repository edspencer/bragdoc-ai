import { Header } from '@/components/header';
import { HeroSection } from '@/components/hero-section';
import { VideoSection } from '@/components/video-section';
import { ProblemSolutionV2 } from '@/components/problem-solution-v2';
import { FeaturesSection } from '@/components/features-section';
import { PrivacySection } from '@/components/privacy-section';
import { QuickStartSection } from '@/components/quick-start-section';
import { MiniFaqSection } from '@/components/mini-faq-section';
// import { WhyItMattersTeaserV1 } from "@/components/why-it-matters-teaser-v1"
import { WhyItMattersTeaserV2 } from '@/components/why-it-matters-teaser-v2';
// import { WhyItMattersTeaserV3 } from "@/components/why-it-matters-teaser-v3"
// import { CTASection } from "@/components/cta-section"
import { CTASectionV2 } from '@/components/cta-section-v2';
// import { CTASectionV3 } from "@/components/cta-section-v3"
import { Footer } from '@/components/footer';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <VideoSection />
        <ProblemSolutionV2 />
        <FeaturesSection />
        <PrivacySection />
        <WhyItMattersTeaserV2 />
        <QuickStartSection />
        <MiniFaqSection />
        <CTASectionV2 />
      </main>
      <Footer />
    </div>
  );
}
