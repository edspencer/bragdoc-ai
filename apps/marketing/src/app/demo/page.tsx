import Link from 'next/link';
import { Container } from '@/components/salient/Container';

export default function Page() {
  return (
    <Container className="pb-16 pt-20 text-center lg:pt-32">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl mb-8">
          Live demo coming soon
        </h1>

        <p className="text-lg text-gray-500 dark:text-gray-400 mb-12">
          This feature is not yet available, but you can sign up for free and
          play with it yourself!
        </p>

        <div className="flex flex-col items-center gap-6">
          <Link
            href="/register"
            className="w-full max-w-sm rounded-md bg-blue-600 dark:bg-blue-400 px-6 py-4 text-lg font-semibold text-white shadow-sm hover:bg-indigo-500 dark:hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Create my FREE account
          </Link>

          <Link
            href="/register"
            className="text-sm/6 font-semibold text-gray-900 dark:text-gray-100"
          >
            Start tracking achievements <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </Container>
  );
}
