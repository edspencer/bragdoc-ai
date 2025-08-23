import Link from 'next/link';
import { Button } from './Button';
import { Container } from './Container';

import { Highlight } from './Highlight';

export function HeroOld() {
  return (
    <Container className="pb-16 pt-20 text-center lg:pt-32">
      <h1 className="mx-auto max-w-4xl font-display text-5xl font-medium tracking-tight text-slate-900 dark:text-white sm:text-7xl">
        Never forget your{' '}
        <span className="relative whitespace-nowrap text-blue-600 dark:text-blue-400">
          <svg
            aria-hidden="true"
            viewBox="0 0 418 42"
            className="absolute left-0 top-2/3 h-[0.58em] w-full fill-blue-300/70"
            preserveAspectRatio="none"
          >
            <path d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C35.421 18.062 18.2 21.766 6.004 25.934 1.244 27.561.828 27.778.874 28.61c.07 1.214.828 1.121 9.595-1.176 9.072-2.377 17.15-3.92 39.246-7.496C123.565 7.986 157.869 4.492 195.942 5.046c7.461.108 19.25 1.696 19.17 2.582-.107 1.183-7.874 4.31-25.75 10.366-21.992 7.45-35.43 12.534-36.701 13.884-2.173 2.308-.202 4.407 4.442 4.734 2.654.187 3.263.157 15.593-.78 35.401-2.686 57.944-3.488 88.365-3.143 46.327.526 75.721 2.23 130.788 7.584 19.787 1.924 20.814 1.98 24.557 1.332l.066-.011c1.201-.203 1.53-1.825.399-2.335-2.911-1.31-4.893-1.604-22.048-3.261-57.509-5.556-87.871-7.36-132.059-7.842-23.239-.254-33.617-.116-50.627.674-11.629.54-42.371 2.494-46.696 2.967-2.359.259 8.133-3.625 26.504-9.81 23.239-7.825 27.934-10.149 28.304-14.005.417-4.348-3.529-6-16.878-7.066Z" />
          </svg>
          <span className="relative">achievements</span>
        </span>{' '}
        again
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg tracking-tight text-slate-700 dark:text-slate-300">
        bragdoc.ai helps you track your work accomplishments effortlessly.
        Perfect for performance reviews, resumes, and career growth.
      </p>
      <div className="mt-10 flex justify-center gap-x-6">
        <Button href="/register" color="blue">
          Get started
        </Button>
        <Button href="/about" variant="outline">
          <span>Learn more</span>
        </Button>
      </div>
    </Container>
  );
}

export function Hero() {
  return (
    <div className="bg-white dark:bg-gray-900">
      <div className="relative">
        <div className="mx-auto max-w-7xl">
          <div className="relative z-10 pt-14 lg:w-full lg:max-w-2xl">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="absolute inset-y-0 right-8 hidden h-full w-80 translate-x-1/2 fill-white dark:fill-gray-900 lg:block"
            >
              <polygon points="0,0 90,0 50,100 0,100" />
            </svg>

            <div className="relative px-6 py-32 sm:py-40 lg:px-8 lg:py-56 lg:pr-0">
              <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl">
                <div className="hidden sm:mb-10 sm:flex">
                  <div className="relative rounded-full px-3 py-1 text-sm/6 text-gray-500 dark:text-gray-400">
                    45,000+ Achievements tracked
                  </div>
                </div>
                <h1 className="text-pretty text-5xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 sm:text-7xl">
                  Get <Highlight>recognized</Highlight> for all your{' '}
                  <span className="">hard work</span>
                </h1>
                <p className="hidden mt-8 text-pretty text-lg font-medium text-gray-500 dark:text-gray-400 sm:text-xl/8">
                  Bragdoc helps you{' '}
                  <Highlight>track your work achievements</Highlight>{' '}
                  effortlessly, and generate performance review documents that
                  <Highlight> your manager will love</Highlight>.
                </p>
                <p className="mt-8 text-pretty text-lg font-medium text-gray-500 dark:text-gray-400 sm:text-xl/8">
                  Bragdoc helps you <Highlight>get recognized</Highlight> for
                  your hard work by tracking your{' '}
                  <Highlight>achievements</Highlight> and creating beautiful
                  documents to share with your boss
                </p>
                <div className="mt-10 flex items-center gap-x-6">
                  <Link
                    href="/register"
                    className="rounded-md bg-blue-600 dark:bg-blue-400 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 dark:hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-400"
                  >
                    Create my FREE account
                  </Link>
                  <Link
                    href="/demo"
                    className="text-sm/6 font-semibold text-gray-900 dark:text-gray-100 hidden"
                  >
                    Try an instant demo <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <img
            alt=""
            src="https://images.unsplash.com/photo-1483389127117-b6a2102724ae?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1587&q=80"
            className="aspect-[3/2] object-cover lg:aspect-auto lg:size-full"
          />
        </div>
      </div>
    </div>
  );
}
