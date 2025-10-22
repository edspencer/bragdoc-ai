import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, X, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function WhyItMattersTeaserV2() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: The Problem */}
          <div>
            <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-3 py-1 rounded-full text-sm font-medium mb-4">
              <X className="size-4" />
              The Problem
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              You're Losing Track of Your Best Work
            </h2>
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="shrink-0 size-6 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5">
                  <X className="size-4 text-destructive" />
                </div>
                <p className="text-muted-foreground">
                  Performance review comes up and you can't remember what you
                  did 6 months ago
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="shrink-0 size-6 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5">
                  <X className="size-4 text-destructive" />
                </div>
                <p className="text-muted-foreground">
                  You meant to keep an achievements.txt file but forgot to
                  update it
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="shrink-0 size-6 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5">
                  <X className="size-4 text-destructive" />
                </div>
                <p className="text-muted-foreground">
                  Your manager doesn't see your full impact because you can't
                  articulate it
                </p>
              </div>
            </div>
          </div>

          {/* Right: The Solution */}
          <div>
            <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium mb-4">
              <Check className="size-4" />
              The Solution
            </div>
            <Card className="border-2 border-primary bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="size-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">
                    BragDoc Does It For You
                  </h3>
                </div>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Experts like Julia Evans and Jeff Morhous have been
                  recommending brag docs for years. BragDoc makes it effortless
                  by automatically capturing your achievements from Git.
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 size-5 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Check className="size-3 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-sm">
                      Automatic tracking from your Git commits
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 size-5 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Check className="size-3 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-sm">AI-powered achievement summaries</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 size-5 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Check className="size-3 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-sm">
                      Ready for performance reviews anytime
                    </p>
                  </div>
                </div>
                <Button className="w-full" size="lg" asChild>
                  <Link href="/why-it-matters">
                    Discover Why This Matters
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
