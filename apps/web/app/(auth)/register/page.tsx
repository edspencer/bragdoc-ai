'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MagicLinkAuthForm } from 'components/magic-link-auth-form';
import { SocialAuthButtons } from 'components/social-auth-buttons';

export default function Page() {
  const [tosAccepted, setTosAccepted] = useState(false);

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl gap-12 flex flex-col">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">
            Create an account
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Get started for free - no password needed
          </p>
        </div>
        <div className="flex flex-col gap-6">
          <MagicLinkAuthForm mode="register" tosAccepted={tosAccepted}>
            <div className="mb-4">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tosAccepted}
                  onChange={(e) => setTosAccepted(e.target.checked)}
                  className="mt-1"
                  required
                />
                <span className="text-gray-600 dark:text-zinc-400">
                  I agree to the{' '}
                  <Link
                    href={`${process.env.NEXT_PUBLIC_MARKETING_SITE_HOST || 'https://www.bragdoc.ai'}/terms`}
                    className="text-gray-800 dark:text-zinc-200 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    href={`${process.env.NEXT_PUBLIC_MARKETING_SITE_HOST || 'https://www.bragdoc.ai'}/privacy-policy`}
                    className="text-gray-800 dark:text-zinc-200 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </div>
          </MagicLinkAuthForm>
          <div className="px-4 sm:px-16">
            <SocialAuthButtons />
            <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
              {'Already have an account? '}
              <Link
                href="/login"
                className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              >
                Sign in
              </Link>
              {' instead.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
