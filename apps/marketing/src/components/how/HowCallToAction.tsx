import { Button } from '@/components/ui/button';
import { Container } from '@/components/salient/Container';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

const APP_HOST = process.env.APP_HOST || 'https://app.bragdoc.ai';

export function HowCallToAction() {
  return (
    <section
      id="get-started"
      className="relative overflow-hidden bg-blue-600 py-32"
    >
      <Container className="relative">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="font-display text-3xl tracking-tight text-white sm:text-4xl">
            Start Building Your Success Story
          </h2>
          <p className="mt-4 text-lg tracking-tight text-white">
            Join thousands of professionals using AI to advance their careers.
            Try bragdoc.ai free and see the difference it makes.
          </p>
          <Button asChild variant="secondary" size="lg" className="mt-10">
            <Link href={`${APP_HOST}/register`}>
              Get Started Free
              <ArrowRightIcon className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
