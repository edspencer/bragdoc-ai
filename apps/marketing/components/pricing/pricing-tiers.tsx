'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTracking } from '@/hooks/use-posthog';
import { loginPath } from '@/lib/utils';

export function PricingTiers() {
  const { trackPricingInteraction, trackCTAClick } = useTracking();
  const loginUrl = loginPath();
  const [billingOption, setBillingOption] = useState<'annual' | 'lifetime'>(
    'annual',
  );

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Full Account - Primary Offering */}
          <Card className="border-[oklch(0.65_0.25_262)] dark:border-[oklch(0.7_0.25_262)] shadow-xl shadow-[oklch(0.65_0.25_262)]/20 dark:shadow-[oklch(0.7_0.25_262)]/20 relative mb-8">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[oklch(0.65_0.25_262)] dark:bg-[oklch(0.7_0.25_262)] text-white">
              <Sparkles className="size-3 mr-1" />
              Full BragDoc Experience
            </Badge>
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl sm:text-4xl">
                Full Account
              </CardTitle>
              <CardDescription className="text-base">
                Everything you need to track and showcase your achievements.
                Start free with trial credits.
              </CardDescription>

              <div className="mt-6 flex justify-center">
                <div className="relative inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setBillingOption('annual');
                      trackPricingInteraction('full_account_annual');
                    }}
                    className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                      billingOption === 'annual'
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Annual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBillingOption('lifetime');
                      trackPricingInteraction('full_account_lifetime');
                    }}
                    className={`px-6 py-2 rounded-md text-sm font-medium transition-all relative ${
                      billingOption === 'lifetime'
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Lifetime
                    <Badge className="absolute -top-2 -right-2 bg-green-600 dark:bg-green-500 text-white text-[10px] px-1.5 py-0.5 leading-none">
                      Best Value
                    </Badge>
                  </button>
                </div>
              </div>

              <div className="mt-6">
                {/* Pricing display */}
                {billingOption === 'annual' ? (
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-bold">$45</span>
                      <span className="text-base text-muted-foreground">
                        /year
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Just $3.75/month, billed annually
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-bold">$99</span>
                      <span className="text-base text-muted-foreground">
                        one-time
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pay once, use forever
                    </p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3 text-lg">
                  AI-Powered Features
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Check className="size-5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                    <span>AI achievement extraction from git commits</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="size-5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                    <span>AI-generated standup summaries</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="size-5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                    <span>AI-generated performance review documents</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="size-5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                    <span>AI impact assessment and categorization</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-lg">Core Features</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Check className="size-5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                    <span>Unlimited achievements, projects, and companies</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="size-5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                    <span>Web app with beautiful dashboard</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="size-5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                    <span>CLI tool for local extraction</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="size-5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                    <span>Data export and full portability</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="size-5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-6">
              {/* Free trial credits callout */}
              <div className="w-full p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-700 dark:text-green-400 text-center">
                  Start free with 10 AI credits + 20 chat messages
                </p>
              </div>

              <Button
                size="lg"
                className="w-full text-lg h-12 bg-[oklch(0.65_0.25_262)] hover:bg-[oklch(0.6_0.25_262)] dark:bg-[oklch(0.7_0.25_262)] dark:hover:bg-[oklch(0.65_0.25_262)]"
                asChild
              >
                <a
                  href={loginUrl}
                  onClick={() =>
                    trackCTAClick('pricing_page', 'Get Started', loginUrl)
                  }
                >
                  Get Started
                </a>
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Try free with trial credits, upgrade anytime
              </p>
            </CardFooter>
          </Card>

          {/* Free Account - Try It Out */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-2xl">Free Account</CardTitle>
              <CardDescription>
                Full CLI features with your own LLM - always free
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                The free account includes manual achievement tracking{' '}
                <strong>
                  and AI-powered achievement extraction via the CLI
                </strong>{' '}
                - you just need to provide your own LLM API keys or use free
                local Ollama. Plus, get trial credits (10 AI credits + 20 chat
                messages) to try cloud features.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                  <span>Manual achievement entry</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>AI-powered achievement extraction via CLI</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                  <span>CLI tool with Git commit analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                  <span>Web app access</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                  <span>Data export</span>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4 italic">
                Requires your own LLM API keys (OpenAI, Anthropic, Google,
                DeepSeek) or free local Ollama. No cloud AI features like
                standup summaries or document generation.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full bg-transparent"
                asChild
              >
                <a
                  href={loginUrl}
                  onClick={() => {
                    trackPricingInteraction('free_account');
                    trackCTAClick(
                      'pricing_page',
                      'Create Free Account',
                      loginUrl,
                    );
                  }}
                >
                  Create Free Account
                </a>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
