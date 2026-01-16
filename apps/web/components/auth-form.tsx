'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MagicLinkAuthForm } from './magic-link-auth-form';
import {
  SocialAuthButtons,
  SocialAuthDivider,
  SocialAuthTosNotice,
} from './social-auth-buttons';
import { DEMO_INTENT_COOKIE_NAME } from '@/lib/demo-intent';

type AuthMode = 'login' | 'register' | 'demo';

interface AuthFormProps {
  mode: AuthMode;
  isDemoFlow?: boolean; // For backward compat with ?demo=true on login/register pages
}

/**
 * Mode-specific configuration for auth forms.
 * Each mode defines its title, subtitle, ToS requirements, and alternate link behavior.
 */
const config = {
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to your account - no password needed',
    showTosCheckbox: false,
    demoBannerText:
      "After signing in, you'll enter demo mode with sample data to explore",
    altLinkText: "Don't have an account?",
    altLinkAction: 'Sign up',
    getAltLinkHref: (isDemoFlow: boolean) =>
      isDemoFlow ? '/demo' : '/register',
  },
  register: {
    title: 'Create an account',
    subtitle: 'Get started for free - no password needed',
    showTosCheckbox: true,
    demoBannerText:
      "After signing up, you'll enter demo mode with sample data to explore",
    altLinkText: 'Already have an account?',
    altLinkAction: 'Sign in',
    getAltLinkHref: (isDemoFlow: boolean) =>
      isDemoFlow ? '/login?demo=true' : '/login',
  },
  demo: {
    title: 'Try the Demo',
    subtitle:
      'Try BragDoc with sample data. Sign in to explore the full experience, then exit demo mode to start fresh with your own achievements.',
    showTosCheckbox: true,
    demoBannerText:
      "After signing in, you'll enter demo mode with sample data to explore",
    altLinkText: 'Already have an account?',
    altLinkAction: 'Sign in to access your data',
    getAltLinkHref: () => '/login',
  },
};

/**
 * ToS checkbox component for explicit consent during registration/demo flows.
 */
function TosCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const marketingSiteHost =
    process.env.NEXT_PUBLIC_MARKETING_SITE_HOST || 'https://www.bragdoc.ai';

  return (
    <div className="mb-4">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1"
          required
        />
        <span className="text-gray-600 dark:text-zinc-400">
          I agree to the{' '}
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
        </span>
      </label>
    </div>
  );
}

/**
 * Unified AuthForm component supporting login, register, and demo modes.
 *
 * Layout order:
 * 1. Title and subtitle
 * 2. Demo banner (when in demo flow)
 * 3. Social auth buttons (Google, GitHub - full-width vertical)
 * 4. ToS notice for social auth
 * 5. "Or continue with email" divider
 * 6. Magic link form with optional ToS checkbox
 * 7. Alternate page link
 */
export function AuthForm({ mode, isDemoFlow = false }: AuthFormProps) {
  const [tosAccepted, setTosAccepted] = useState(false);

  const modeConfig = config[mode];
  const showTosCheckbox = modeConfig.showTosCheckbox;
  const showDemoBanner = mode === 'demo' || isDemoFlow;

  // Set demo intent cookie when in demo mode or demo flow
  useEffect(() => {
    const shouldSetCookie = mode === 'demo' || isDemoFlow;
    if (shouldSetCookie) {
      document.cookie = `${DEMO_INTENT_COOKIE_NAME}=true; Path=/; SameSite=Lax; Max-Age=3600`;
    }
  }, [mode, isDemoFlow]);

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-2xl rounded-2xl flex flex-col gap-8 2xl:gap-12">
        {/* Form content - constrained to narrower width */}
        <div className="w-full max-w-md mx-auto flex flex-col gap-8">
          {/* Title and subtitle (appears FIRST, before demo banner) */}
          <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
            <h3 className="text-xl font-semibold dark:text-zinc-50">
              {modeConfig.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              {modeConfig.subtitle}
            </p>
          </div>

          {/* Demo banner - shown when in demo flow or on demo page */}
          {showDemoBanner && (
            <div className="px-4 sm:px-8 lg:px-16 pt-2">
              <div className="text-center">
                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 py-2 px-4 rounded-lg">
                  {modeConfig.demoBannerText}
                </p>
              </div>
            </div>
          )}

          {/* Social auth buttons (full-width, vertical) */}
          <div className="flex flex-col gap-4 px-4 sm:px-16">
            <SocialAuthButtons
              layout="vertical"
              showDivider={false}
              showTosNotice={false}
            />
            <SocialAuthTosNotice />
          </div>

          {/* Divider */}
          <div className="px-4 sm:px-16">
            <SocialAuthDivider text="Or continue with email" />
          </div>

          {/* Magic link form with optional ToS checkbox */}
          <MagicLinkAuthForm
            mode={mode === 'demo' ? 'register' : mode}
            tosAccepted={showTosCheckbox ? tosAccepted : undefined}
          >
            {showTosCheckbox && (
              <TosCheckbox checked={tosAccepted} onChange={setTosAccepted} />
            )}
          </MagicLinkAuthForm>

          {/* Alternate page link */}
          <div className="px-4 sm:px-16 text-center">
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              {modeConfig.altLinkText}{' '}
              <Link
                href={modeConfig.getAltLinkHref(isDemoFlow)}
                className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              >
                {modeConfig.altLinkAction}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
