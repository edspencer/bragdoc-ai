import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { GetStartedHeader } from '@/components/get-started/get-started-header';
import { GetStartedVideo } from '@/components/get-started/get-started-video';
import { PathSelection } from '@/components/get-started/path-selection';
import { NextSteps } from '@/components/get-started/next-steps';
import { Troubleshooting } from '@/components/get-started/troubleshooting';
import { GetStartedCTA } from '@/components/get-started/get-started-cta';
import { HowToSchema } from '@/components/structured-data/how-to-schema';

export const metadata: Metadata = {
  title:
    'Get Started with BragDoc: 5-Minute Setup Guide for Automatic Achievement Tracking',
  description:
    'Quick start guide: Install BragDoc CLI, configure your LLM, extract achievements from git commits. Video tutorial and step-by-step instructions included.',
  keywords:
    'get started bragdoc, bragdoc tutorial, setup achievement tracking, install bragdoc cli',
  alternates: {
    canonical: '/get-started',
  },
};

const getStartedSteps = [
  {
    name: 'Install BragDoc CLI',
    text: 'Run npm install -g @bragdoc/cli to install the command-line tool globally.',
  },
  {
    name: 'Login to BragDoc',
    text: 'Run bragdoc login to authenticate with your account.',
  },
  {
    name: 'Initialize Repository',
    text: 'Navigate to your git repository and run bragdoc init to connect it to BragDoc.',
  },
  {
    name: 'Configure LLM',
    text: 'Set up your preferred LLM provider (OpenAI, Anthropic, or local Ollama).',
  },
  {
    name: 'Extract Achievements',
    text: 'Run bragdoc extract to automatically analyze your git commits and extract achievements.',
  },
];

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-background">
      <HowToSchema
        name="Getting Started with BragDoc"
        description="Quick 5-minute setup guide for BragDoc achievement tracking"
        steps={getStartedSteps}
      />
      <Header />
      <main className="pt-16">
        <GetStartedHeader />
        <GetStartedVideo />
        <PathSelection />
        <NextSteps />
        <Troubleshooting />
        <GetStartedCTA />
      </main>
      <Footer />
    </div>
  );
}
