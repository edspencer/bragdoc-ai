import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SelfHostingHeader } from '@/components/self-hosting/self-hosting-header';
import { SelfHostingVideo } from '@/components/self-hosting/self-hosting-video';
import { SelfHostingSteps } from '@/components/self-hosting/self-hosting-steps';
import { SelfHostingFAQ } from '@/components/self-hosting/self-hosting-faq';
import { SelfHostingCTA } from '@/components/self-hosting/self-hosting-cta';

export default function SelfHostingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <SelfHostingHeader />
        <SelfHostingVideo />
        <SelfHostingSteps />
        <SelfHostingFAQ />
        <SelfHostingCTA />
      </main>
      <Footer />
    </div>
  );
}
