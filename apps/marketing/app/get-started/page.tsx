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
    'Get Started with BragDoc: 6-Minute Setup Guide for Automatic Achievement Tracking',
  description:
    'Quick start guide: Install BragDoc CLI, configure your LLM, create your account, and extract achievements from git commits. Video tutorial and step-by-step instructions included.',
  keywords:
    'get started bragdoc, bragdoc tutorial, setup achievement tracking, install bragdoc cli',
  alternates: {
    canonical: '/get-started',
  },
};

const getStartedSteps = [
  {
    name: 'Install CLI',
    text: 'Run npm install -g @bragdoc/cli to install the command-line tool globally.',
  },
  {
    name: 'Create Account',
    text: 'Set up your free account.',
  },
  {
    name: 'Add Your AI API Key',
    text: 'In the web app, open Account Settings → AI Provider and add your own API key (OpenAI, Anthropic, Google, DeepSeek, or an OpenAI-compatible endpoint). This powers web AI features like chat and document generation. On bragdoc.ai an Ollama or OpenAI-compatible base URL has to be reachable from the internet — to use Ollama on your own machine, point the CLI at it instead.',
  },
  {
    name: 'Authenticate',
    text: 'Run bragdoc login to connect the CLI to your BragDoc account.',
  },
  {
    name: 'Initialize First Project',
    text: 'Navigate to your git repository and run bragdoc init to connect it to BragDoc. On first run this also walks you through choosing the LLM the CLI uses locally — including a local Ollama model.',
  },
  {
    name: 'Extract Achievements',
    text: 'Run bragdoc extract to automatically analyze your git commits and extract achievements.',
  },
  {
    name: 'See Your Impact',
    text: 'Log in to the web app to view, organize, and share the achievements the CLI has collected.',
  },
];

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-background">
      <HowToSchema
        name="Getting Started with BragDoc"
        description="Quick 6-minute setup guide for BragDoc achievement tracking"
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
