import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/salient/Container';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

export function WhyCallToAction() {
  return (
    <section
      id="get-started"
      className="relative overflow-hidden bg-blue-600 py-32"
    >
      <Container className="relative">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="font-display text-3xl tracking-tight text-white sm:text-4xl">
            Take Control of Your Career Story
          </h2>
          <p className="mt-4 text-lg tracking-tight text-white">
            Join thousands of professionals who are leveraging brag documents to
            advance their careers. Start documenting your achievements today.
          </p>
          <Button asChild variant="secondary" size="lg" className="mt-10">
            <Link href="/register">
              Start Your Brag Document
              <ArrowRightIcon className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
