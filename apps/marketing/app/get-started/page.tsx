import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { GetStartedHeader } from '@/components/get-started/get-started-header';
import { GetStartedVideo } from '@/components/get-started/get-started-video';
import { PathSelection } from '@/components/get-started/path-selection';
import { NextSteps } from '@/components/get-started/next-steps';
import { Troubleshooting } from '@/components/get-started/troubleshooting';
import { GetStartedCTA } from '@/components/get-started/get-started-cta';

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
