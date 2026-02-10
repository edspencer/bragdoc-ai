import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { HeroSection } from '@/components/hero-section';
import { VideoSection } from '@/components/video-section';
import { MeetTheTeamIntro } from '@/components/meet-the-team-intro';
import { ProblemSolutionV2 } from '@/components/problem-solution-v2';
import { TransformationFunnel } from '@/components/transformation-funnel';
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
import { OrganizationSchema } from '@/components/structured-data/organization-schema';
import { SoftwareApplicationSchema } from '@/components/structured-data/software-application-schema';

export const metadata: Metadata = {
  title: 'BragDoc - AI-Powered Achievement Tracking for Developers',
  description:
    'Automatically track your professional achievements from git commits. Build your brag document effortlessly with AI. Perfect for performance reviews, standups, and career growth.',
  keywords:
    'brag document, achievement tracking, performance review, developer tools, git commit tracker, career development',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'BragDoc - Your Work Deserves to Be Remembered',
    description:
      'Automatically track work achievements from git commits. Always be ready for performance reviews.',
    type: 'website',
    url: 'https://www.bragdoc.ai',
    siteName: 'BragDoc',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BragDoc - AI Achievement Tracking',
    description: 'Automatically track achievements from git commits',
  },
};

export default function Home() {
  return (
    <div className="min-h-screen">
      <OrganizationSchema />
      <SoftwareApplicationSchema />
      <Header />
      <main>
        <HeroSection />
        <TransformationFunnel />
        <VideoSection />
        <MeetTheTeamIntro />
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
