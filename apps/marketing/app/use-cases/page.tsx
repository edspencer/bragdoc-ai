import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { UseCasesHeader } from '@/components/use-cases/use-cases-header';
import { UseCaseCards } from '@/components/use-cases/use-case-cards';
import { ComparisonTable } from '@/components/use-cases/comparison-table';
import { UseCasesCta } from '@/components/use-cases/use-cases-cta';

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <UseCasesHeader />
        <UseCaseCards />
        <ComparisonTable />
        <UseCasesCta />
      </main>
      <Footer />
    </div>
  );
}
