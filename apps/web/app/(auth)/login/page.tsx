'use client';

import Link from 'next/link';
import { MagicLinkAuthForm } from 'components/magic-link-auth-form';
import { SocialAuthButtons } from 'components/social-auth-buttons';
import { DemoModePrompt } from 'components/demo-mode-prompt';

export default function Page() {
  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-2xl rounded-2xl flex flex-col gap-8 2xl:gap-12">
        {/* Demo Mode CTA - wider on larger screens */}
        <div className="px-4 sm:px-8 lg:px-16 pt-2">
          <DemoModePrompt />
        </div>

        {/* Login Form - constrained to narrower width */}
        <div className="w-full max-w-md mx-auto flex flex-col gap-12">
          <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
            <h3 className="text-xl font-semibold dark:text-zinc-50">
              Welcome back
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Sign in to your account - no password needed
            </p>
          </div>
          <div className="flex flex-col gap-6">
            <MagicLinkAuthForm mode="login" />
            <div className="px-4 sm:px-16">
              <SocialAuthButtons />
              <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
                {"Don't have an account? "}
                <Link
                  href="/register"
                  className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
                >
                  Sign up
                </Link>
                {' for free.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
