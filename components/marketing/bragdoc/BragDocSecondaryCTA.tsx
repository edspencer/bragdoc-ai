import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/salient/Container';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

export function BragDocSecondaryCTA() {
  return (
    <section
      id="get-started-today"
      className="relative overflow-hidden bg-slate-50 dark:bg-slate-900 py-32"
    >
      <Container className="relative">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Your Future Self Will Thank You
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            Start documenting your achievements today. Join thousands of
            professionals who are taking control of their career narrative.
          </p>
          <Button asChild size="lg" className="mt-10">
            <Link href="/register">
              Create Your Brag Document
              <ArrowRightIcon className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
