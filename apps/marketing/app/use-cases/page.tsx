import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { UseCasesHeader } from '@/components/use-cases/use-cases-header';
import { UseCaseCards } from '@/components/use-cases/use-case-cards';
import { ComparisonTable } from '@/components/use-cases/comparison-table';
import { UseCasesCta } from '@/components/use-cases/use-cases-cta';

export const metadata: Metadata = {
  title:
    'BragDoc Use Cases: Performance Reviews, Job Interviews, Salary Negotiations & More',
  description:
    'Discover how developers use BragDoc for performance reviews, resume building, 1-on-1 meetings, job interviews, promotion packets, and salary negotiations. Real use cases and examples.',
  keywords:
    'bragdoc use cases, performance review tool, interview preparation, salary negotiation tool, promotion packet',
};

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
