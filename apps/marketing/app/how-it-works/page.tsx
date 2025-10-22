import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { HowItWorksHeader } from '@/components/how-it-works/how-it-works-header';
import { WorkflowSteps } from '@/components/how-it-works/workflow-steps';
import { PrivacyArchitecture } from '@/components/how-it-works/privacy-architecture';
import { PrivacyArchitectureV2 } from '@/components/how-it-works/privacy-architecture-v2';
import { PrivacyArchitectureV3 } from '@/components/how-it-works/privacy-architecture-v3';
import { WorkflowExamples } from '@/components/how-it-works/workflow-examples';
import { HowItWorksCTA } from '@/components/how-it-works/how-it-works-cta';

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
