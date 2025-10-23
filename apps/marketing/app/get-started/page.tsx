import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { GetStartedHeader } from '@/components/get-started/get-started-header';
import { GetStartedVideo } from '@/components/get-started/get-started-video';
import { PathSelection } from '@/components/get-started/path-selection';
import { NextSteps } from '@/components/get-started/next-steps';
import { Troubleshooting } from '@/components/get-started/troubleshooting';
import { GetStartedCTA } from '@/components/get-started/get-started-cta';

export const metadata: Metadata = {
  title:
    'Get Started with BragDoc: 5-Minute Setup Guide for Automatic Achievement Tracking',
  description:
    'Quick start guide: Install BragDoc CLI, configure your LLM, extract achievements from git commits. Video tutorial and step-by-step instructions included.',
  keywords:
    'get started bragdoc, bragdoc tutorial, setup achievement tracking, install bragdoc cli',
};

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-background">
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
