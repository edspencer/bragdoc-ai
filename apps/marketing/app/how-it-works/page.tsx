import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { HowItWorksHeader } from '@/components/how-it-works/how-it-works-header';
import { WorkflowSteps } from '@/components/how-it-works/workflow-steps';
import { PrivacyArchitectureV2 } from '@/components/how-it-works/privacy-architecture-v2';
import { PrivacyDiagram } from '@/components/how-it-works/privacy-diagram';
import { WorkflowExamples } from '@/components/how-it-works/workflow-examples';
import { HowItWorksCTA } from '@/components/how-it-works/how-it-works-cta';
import { HowToSchema } from '@/components/structured-data/how-to-schema';

export const metadata: Metadata = {
  title: 'How BragDoc Works: Automatic Achievement Tracking from Git Commits',
  description:
    'Learn how BragDoc automatically tracks your achievements: CLI extracts from git commits locally, AI analyzes impact, web app organizes everything. Your code never leaves your machine.',
  keywords:
    'how bragdoc works, git commit tracking, automatic achievement extraction, privacy-first tracking',
  alternates: {
    canonical: '/how-it-works',
  },
};

const howItWorksSteps = [
  {
    name: 'Install CLI',
    text: 'Install the BragDoc CLI tool on your local machine.',
  },
  {
    name: 'Connect Repository',
    text: 'Link your git repositories to BragDoc for automatic tracking.',
  },
  {
    name: 'Extract Commits',
    text: 'The CLI reads git commit messages locally on your machine.',
  },
  {
    name: 'AI Analysis',
    text: 'Your configured LLM analyzes commits and extracts achievements.',
  },
  {
    name: 'Review & Organize',
    text: 'Review achievements in the web app and organize by project.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <HowToSchema
        name="How BragDoc Works"
        description="Automatic achievement tracking from git commits"
        steps={howItWorksSteps}
      />
      <Header />
      <main className="pt-16">
        <HowItWorksHeader />
        <WorkflowSteps />
        <PrivacyArchitectureV2 />
        <PrivacyDiagram />
        <WorkflowExamples />
        <HowItWorksCTA />
      </main>
      <Footer />
    </div>
  );
}
