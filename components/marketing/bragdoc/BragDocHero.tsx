import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/salient/Container';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

export function BragDocHero() {
  return (
    <Container className="pb-16 pt-20 text-center lg:pt-32">
      <h1 className="mx-auto max-w-4xl font-display text-5xl font-medium tracking-tight text-slate-900 dark:text-slate-100 sm:text-7xl">
        Your{' '}
        <span className="relative whitespace-nowrap text-blue-600">
          <span className="relative">professional achievements</span>
        </span>{' '}
        deserve to be remembered
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg tracking-tight text-slate-700 dark:text-slate-300">
        A brag document is your personal record of professional wins, making
        performance reviews and career advancement effortless. Stop letting your
        achievements go unnoticed.
      </p>
      <div className="mt-10 flex justify-center gap-x-6">
        <Button asChild size="lg">
          <Link href="/register">
            Start Your Brag Document
            <ArrowRightIcon className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="#examples">See Examples</Link>
        </Button>
      </div>
      <div className="mt-36 lg:mt-44">
        <p className="font-display text-base text-slate-900 dark:text-slate-100">
          Trusted by professionals at leading companies
        </p>
        <ul
          role="list"
          className="mt-8 flex items-center justify-center gap-x-8 sm:flex-col sm:gap-x-0 sm:gap-y-10 xl:flex-row xl:gap-x-12 xl:gap-y-0"
        >
          {[
            ['Meta', 'text-[#1877F2]'],
            ['Google', 'text-[#4285F4]'],
            ['Microsoft', 'text-[#00A4EF]'],
            ['Amazon', 'text-[#FF9900]'],
          ].map(([company, color]) => (
            <li key={company} className={`flex ${color}`}>
              <span className="font-semibold">{company}</span>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
