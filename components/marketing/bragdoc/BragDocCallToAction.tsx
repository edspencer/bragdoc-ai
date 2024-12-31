import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/salient/Container';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

export function BragDocCallToAction() {
  return (
    <section
      id="get-started"
      className="relative overflow-hidden bg-blue-600 py-32"
    >
      <Container className="relative">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="font-display text-3xl tracking-tight text-white sm:text-4xl">
            Start Building Your Brag Document Today
          </h2>
          <p className="mt-4 text-lg tracking-tight text-white">
            Don&apos;t let another achievement go undocumented. Our AI-powered
            assistant helps you capture and organize your wins as they happen.
          </p>
          <Button asChild variant="secondary" size="lg" className="mt-10">
            <Link href="/register">
              Get Started Free
              <ArrowRightIcon className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
