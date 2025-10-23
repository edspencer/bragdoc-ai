import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PrivacyHeader } from '@/components/privacy/privacy-header';
import { ArchitectureDiagram } from '@/components/privacy/architecture-diagram';
import { DataAccess } from '@/components/privacy/data-access';
import { PrivacyArchitecture } from '@/components/how-it-works/privacy-architecture';
import { LlmProviderPrivacy } from '@/components/privacy/llm-provider-privacy';
import { OfflineMode } from '@/components/privacy/offline-mode';
import { DataControl } from '@/components/privacy/data-control';
import { SecurityMeasures } from '@/components/privacy/security-measures';
import { OpenSourceTransparency } from '@/components/privacy/open-source-transparency';
import { Compliance } from '@/components/privacy/compliance';
import { PrivacyCta } from '@/components/privacy/privacy-cta';

export const metadata: Metadata = {
  title: 'BragDoc Privacy: Your Code Stays Local, Zero-Knowledge Architecture',
  description:
    'BragDoc privacy-first architecture: Your code never leaves your machine, CLI runs locally, optional self-hosting, full data export anytime. Learn how we protect your data.',
  keywords:
    'bragdoc privacy, is bragdoc safe, local code analysis, privacy-first achievement tracking',
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">
        <PrivacyHeader />
        <ArchitectureDiagram />
        <DataAccess />
        <PrivacyArchitecture />
        <LlmProviderPrivacy />
        <OfflineMode />
        <DataControl />
        <SecurityMeasures />
        <OpenSourceTransparency />
        <Compliance />
        <PrivacyCta />
      </main>
      <Footer />
    </>
  );
}
