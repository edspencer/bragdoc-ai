'use client';

import { signIn } from '@/lib/better-auth/client';
import {
  GoogleLoginButton,
  GithubLoginButton,
} from 'react-social-login-buttons';
import Link from 'next/link';

/**
 * Standalone divider component for flexible composition in auth forms.
 * Displays a horizontal line with centered text.
 */
export function SocialAuthDivider({
  text = 'Or continue with email',
}: {
  text?: string;
}) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-muted" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}

/**
 * Standalone ToS notice component for social authentication.
 * Informs users that continuing with Google or GitHub implies agreement to Terms and Privacy Policy.
 */
export function SocialAuthTosNotice() {
  const marketingSiteHost =
    process.env.NEXT_PUBLIC_MARKETING_SITE_HOST || 'https://www.bragdoc.ai';

  return (
    <p className="text-sm text-center text-gray-600 dark:text-zinc-400 px-2">
      By continuing with Google or GitHub, you agree to our{' '}
      <Link
        href={`${marketingSiteHost}/terms`}
        className="text-gray-800 dark:text-zinc-200 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link
        href={`${marketingSiteHost}/privacy-policy`}
        className="text-gray-800 dark:text-zinc-200 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Privacy Policy
      </Link>
    </p>
  );
}

interface SocialAuthButtonsProps {
  layout?: 'grid' | 'vertical';
  showDivider?: boolean;
  showTosNotice?: boolean;
}

export function SocialAuthButtons({
  layout = 'grid',
  showDivider = true,
  showTosNotice = true,
}: SocialAuthButtonsProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {showDivider && <SocialAuthDivider text="Or continue with" />}

      {showTosNotice && (
        <div className="mt-4 mb-3">
          <SocialAuthTosNotice />
        </div>
      )}

      <div
        className={
          layout === 'vertical'
            ? 'flex flex-col gap-3'
            : 'grid grid-cols-2 gap-3'
        }
      >
        <GoogleLoginButton
          onClick={() =>
            signIn.social({ provider: 'google', callbackURL: '/dashboard' })
          }
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          Continue with Google
        </GoogleLoginButton>

        <GithubLoginButton
          onClick={() =>
            signIn.social({ provider: 'github', callbackURL: '/dashboard' })
          }
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          Continue with GitHub
        </GithubLoginButton>
      </div>
    </div>
  );
}
