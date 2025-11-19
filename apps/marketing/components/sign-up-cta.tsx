'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Zap, Trophy, ArrowRight, Rocket, Shield } from 'lucide-react';
import { appPath } from '@/lib/utils';

type CTAVariant = 'urgency' | 'value' | 'personal';

interface SignUpCTAProps {
  variant?: CTAVariant;
  className?: string;
}

export function SignUpCTA({
  variant = 'urgency',
  className = '',
}: SignUpCTAProps) {
  const signUpUrl = appPath('/register');

  const variants = {
    urgency: {
      icon: Zap,
      iconColor: 'text-blue-500',
      headline: 'Start Free Today',
      description:
        'Join 1,000+ professionals already tracking their wins. Limited spots for early access.',
      buttonText: 'Claim My Free Account',
      subtext: 'No credit card required • Upgrade anytime',
      gradient: 'from-blue-500 via-cyan-500 to-sky-500',
      bgGradient: 'from-blue-600 to-sky-600',
      hoverGradient: 'hover:from-blue-600 hover:to-sky-600',
      showArrow: true,
    },
    value: {
      icon: Trophy,
      iconColor: 'text-indigo-500',
      headline: 'Unlock Your Career Story',
      description:
        'Transform your daily wins into compelling career narratives that get you promoted.',
      buttonText: 'Get Started Free',
      subtext: 'Free forever plan • Upgrade anytime',
      gradient: 'from-indigo-500 via-blue-500 to-cyan-500',
      bgGradient: 'from-indigo-600 to-cyan-600',
      hoverGradient: 'hover:from-indigo-600 hover:to-cyan-600',
      showArrow: false,
    },
    personal: {
      icon: Rocket,
      iconColor: 'text-sky-500',
      headline: 'Ready to Level Up?',
      description:
        'Your achievements deserve better than a forgotten Google Doc. Start building your brag doc in seconds.',
      buttonText: 'Yes, I Want This →',
      subtext: '✓ Quick setup • ✓ AI-powered • ✓ Free to start',
      gradient: 'from-sky-500 via-blue-500 to-indigo-500',
      bgGradient: 'from-sky-600 to-indigo-600',
      hoverGradient: 'hover:from-sky-600 hover:to-indigo-600',
      showArrow: false,
    },
  };

  const currentVariant = variants[variant];
  const Icon = currentVariant.icon;

  return (
    <div className={`not-prose my-8 max-w-xl mx-auto ${className}`}>
      <Link href={signUpUrl} className="block group">
        <div
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${currentVariant.gradient} p-[2px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}
        >
          <div className="relative bg-background rounded-[10px] p-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${currentVariant.iconColor}`} />
                <h4
                  className={`font-semibold text-lg bg-gradient-to-r ${currentVariant.bgGradient} bg-clip-text text-transparent`}
                >
                  {currentVariant.headline}
                </h4>
                {variant === 'urgency' && (
                  <Zap className="h-5 w-5 text-sky-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                {currentVariant.description}
              </p>
              <Button
                className={`w-full bg-gradient-to-r ${currentVariant.gradient} ${currentVariant.hoverGradient} text-white border-0 shadow-md group-hover:shadow-lg transition-all flex items-center justify-center gap-2`}
              >
                {currentVariant.buttonText}
                {currentVariant.showArrow && (
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                )}
              </Button>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {currentVariant.subtext}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// Export individual variants for easy use
export function SignUpCTAUrgency(props: Omit<SignUpCTAProps, 'variant'>) {
  return <SignUpCTA {...props} variant="urgency" />;
}

export function SignUpCTAValue(props: Omit<SignUpCTAProps, 'variant'>) {
  return <SignUpCTA {...props} variant="value" />;
}

export function SignUpCTAPersonal(props: Omit<SignUpCTAProps, 'variant'>) {
  return <SignUpCTA {...props} variant="personal" />;
}

// Compact variant for sidebars or smaller spaces
export function SignUpCTACompact({ className = '' }: { className?: string }) {
  const signUpUrl = appPath('/register');

  return (
    <div className={`not-prose ${className}`}>
      <Link href={signUpUrl} className="block group">
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-500 p-[2px] shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <div className="relative bg-background rounded-[6px] p-3">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-blue-500" />
                <h4 className="font-semibold text-sm bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent">
                  Free Forever Plan
                </h4>
              </div>
              <Button className="w-full h-8 text-sm bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white border-0">
                Start Free
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// Test variant switcher for development
export function SignUpCTADemo() {
  const [variant, setVariant] = useState<CTAVariant>('urgency');

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setVariant('urgency')}
          className={`px-3 py-1 rounded text-sm ${
            variant === 'urgency'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Urgency
        </button>
        <button
          type="button"
          onClick={() => setVariant('value')}
          className={`px-3 py-1 rounded text-sm ${
            variant === 'value'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Value
        </button>
        <button
          type="button"
          onClick={() => setVariant('personal')}
          className={`px-3 py-1 rounded text-sm ${
            variant === 'personal'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Personal
        </button>
      </div>
      <SignUpCTA variant={variant} />
    </div>
  );
}
