import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { HowItWorksHeader } from '@/components/how-it-works/how-it-works-header';
import { WorkflowSteps } from '@/components/how-it-works/workflow-steps';
import { PrivacyArchitecture } from '@/components/how-it-works/privacy-architecture';
import { PrivacyArchitectureV2 } from '@/components/how-it-works/privacy-architecture-v2';
import { PrivacyArchitectureV3 } from '@/components/how-it-works/privacy-architecture-v3';
import { WorkflowExamples } from '@/components/how-it-works/workflow-examples';
import { HowItWorksCTA } from '@/components/how-it-works/how-it-works-cta';

export const metadata: Metadata = {
  title: 'How BragDoc Works: Automatic Achievement Tracking from Git Commits',
  description:
    'Learn how BragDoc automatically tracks your achievements: CLI extracts from git commits locally, AI analyzes impact, web app organizes everything. Your code never leaves your machine.',
  keywords:
    'how bragdoc works, git commit tracking, automatic achievement extraction, privacy-first tracking',
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <HowItWorksHeader />
        <WorkflowSteps />
        <PrivacyArchitecture />
        <PrivacyArchitectureV2 />
        <PrivacyArchitectureV3 />
        <WorkflowExamples />
        <HowItWorksCTA />
      </main>
      <Footer />
    </div>
  );
}
