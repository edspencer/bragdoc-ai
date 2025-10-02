import Link from 'next/link';
import { Highlight } from './Highlight';

const APP_HOST = process.env.APP_HOST || 'https://app.bragdoc.ai';

export function SecondaryCTA() {
  return (
    <div className="bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <h2 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
          Get the <Highlight>recognition</Highlight> you deserve
        </h2>
        <p className="mt-4 max-w-2xl text-lg/7 text-gray-600 dark:text-gray-400">
          Sign up for a free account now.
        </p>
        <div className="mt-10 flex items-center gap-x-6">
          <Link
            href={`${APP_HOST}/register`}
            className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-800 dark:hover:bg-blue-700"
          >
            Create my FREE account now
          </Link>
          <Link
            href="/demo"
            className="text-sm/6 font-semibold text-gray-900 dark:text-white hidden"
          >
            1-click instant demo <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
