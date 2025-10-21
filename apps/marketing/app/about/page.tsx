import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { AboutHeader } from '@/components/about/about-header';
import { ProblemSection } from '@/components/about/problem-section';
import { OriginStory } from '@/components/about/origin-story';
import { PhilosophySection } from '@/components/about/philosophy-section';
import { DifferenceSection } from '@/components/about/difference-section';
import { ValuesSection } from '@/components/about/values-section';
import { VisionSection } from '@/components/about/vision-section';
import { AboutCTA } from '@/components/about/about-cta';

export const metadata: Metadata = {
  title: "Why BragDoc Exists - The Problem We're Solving",
  description:
    'Built by a developer who lived this problem. Learn about the origin story and philosophy behind BragDoc.',
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">
        <AboutHeader />
        <ProblemSection />
        <OriginStory />
        <PhilosophySection />
        <DifferenceSection />
        <ValuesSection />
        <VisionSection />
        <AboutCTA />
      </main>
      <Footer />
    </>
  );
}
