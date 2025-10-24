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

export function PricingTiers() {
  const { trackPricingInteraction, trackCTAClick } = useTracking();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>(
    'monthly',
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
                Everything you need to track and showcase your achievements
              </CardDescription>

              <div className="mt-6 flex justify-center">
                <div className="relative inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setBillingPeriod('monthly');
                      trackPricingInteraction('full_account_monthly');
                    }}
                    className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                      billingPeriod === 'monthly'
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBillingPeriod('annual');
                      trackPricingInteraction('full_account_annual');
                    }}
                    className={`px-6 py-2 rounded-md text-sm font-medium transition-all relative ${
                      billingPeriod === 'annual'
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Annual
                    <Badge className="absolute -top-2 -right-2 bg-green-600 dark:bg-green-500 text-white text-[10px] px-1.5 py-0.5 leading-none">
                      Save 25%
                    </Badge>
                  </button>
                </div>
              </div>

              <div className="mt-6">
                {billingPeriod === 'monthly' ? (
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold">$4.99</span>
                      <span className="text-muted-foreground text-lg">
                        /month
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Billed monthly
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold">$44.99</span>
                      <span className="text-muted-foreground text-lg">
                        /year
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Billed annually
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
              <Button
                size="lg"
                className="w-full text-lg h-12 bg-[oklch(0.65_0.25_262)] hover:bg-[oklch(0.6_0.25_262)] dark:bg-[oklch(0.7_0.25_262)] dark:hover:bg-[oklch(0.65_0.25_262)]"
                asChild
              >
                <a
                  href="https://app.bragdoc.ai/login"
                  onClick={() =>
                    trackCTAClick(
                      'pricing_page',
                      'Get Started',
                      'https://app.bragdoc.ai/login',
                    )
                  }
                >
                  Get Started
                </a>
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Start with a free account, upgrade anytime
              </p>
            </CardFooter>
          </Card>

          {/* Free Account - Try It Out */}
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-2xl">Free Account</CardTitle>
              <CardDescription>Try BragDoc without AI features</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                The free account lets you explore BragDoc and manually track
                achievements, but doesn't include the AI-powered features that
                make BragDoc truly powerful.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                  <span>Manual achievement entry</span>
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
                No AI extraction, no document generation, no standup summaries
              </p>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full bg-transparent"
                asChild
              >
                <a
                  href="https://app.bragdoc.ai/login"
                  onClick={() => {
                    trackPricingInteraction('free_account');
                    trackCTAClick(
                      'pricing_page',
                      'Create Free Account',
                      'https://app.bragdoc.ai/login',
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
