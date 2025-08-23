import { Button } from '@bragdoc/ui/button';
import { Container } from '@/components/salient/Container';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

export function HowHero() {
  return (
    <Container className="pb-16 pt-20 text-center lg:pt-32">
      <h1 className="mx-auto max-w-4xl font-display text-5xl font-medium tracking-tight text-slate-900 dark:text-slate-100 sm:text-7xl">
        Let AI{' '}
        <span className="relative whitespace-nowrap text-blue-600">
          <span className="relative">power your growth</span>
        </span>{' '}
        with bragdoc.ai
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg tracking-tight text-slate-700 dark:text-slate-300">
        Our AI assistant automatically captures your achievements as you work,
        turning daily wins into powerful career advancement tools. See how
        bragdoc.ai makes it effortless to build your success story.
      </p>
      <div className="mt-10 flex justify-center gap-x-6">
        <Button asChild size="lg">
          <Link href="/register">
            Try It Free
            <ArrowRightIcon className="ml-2 size-4" />
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="#demo">See How It Works</Link>
        </Button>
      </div>
    </Container>
  );
}
