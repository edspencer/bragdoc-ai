import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/salient/Container';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

export function WhyHero() {
  return (
    <Container className="pb-16 pt-20 text-center lg:pt-32">
      <h1 className="mx-auto max-w-4xl font-display text-5xl font-medium tracking-tight text-slate-900 dark:text-slate-100 sm:text-7xl">
        Why Your Career Needs a{' '}
        <span className="relative whitespace-nowrap text-blue-600">
          <span className="relative">Brag Document</span>
        </span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg tracking-tight text-slate-700 dark:text-slate-300">
        In today&apos;s competitive workplace, your achievements speak louder
        than your job title. Learn why keeping a brag document is crucial for
        your career growth and success.
      </p>
      <div className="mt-10 flex justify-center gap-x-6">
        <Button asChild size="lg">
          <Link href="/register">
            Start Your Success Story
            <ArrowRightIcon className="ml-2 size-4" />
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="#research">See the Research</Link>
        </Button>
      </div>
    </Container>
  );
}
