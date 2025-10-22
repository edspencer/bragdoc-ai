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
