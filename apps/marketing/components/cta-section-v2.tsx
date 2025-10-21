import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';

export function CTASectionV2() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 p-1">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(white,transparent_85%)]" />
          <Card className="relative border-0 bg-primary text-primary-foreground p-12 sm:p-16">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left side - Content */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">Free to start</span>
                </div>

                <h2 className="text-4xl sm:text-5xl font-bold text-balance leading-tight">
                  Start Building Your Achievement History Today
                </h2>

                <p className="text-lg text-primary-foreground/80 leading-relaxed">
                  Join thousands of developers who never miss a win. Automatic
                  tracking, AI-powered insights, and career-boosting reports.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="text-base h-14 px-8 font-semibold group"
                    asChild
                  >
                    <a href="https://app.bragdoc.ai/login">
                      Start Tracking Free
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-base h-14 px-8 bg-transparent border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                    asChild
                  >
                    <Link href="/how-it-works">See How It Works</Link>
                  </Button>
                </div>
              </div>

              {/* Right side - Quick install */}
              <div className="space-y-4">
                <Card className="bg-primary-foreground/5 border-primary-foreground/20 p-6 space-y-4">
                  <div className="flex items-center gap-2 text-primary-foreground">
                    <Zap className="h-5 w-5" />
                    <span className="font-semibold">2-Minute Setup</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-primary-foreground/90">
                          Install the CLI
                        </p>
                        <div className="mt-2 bg-primary-foreground/10 rounded-lg p-3 font-mono text-xs">
                          <code className="text-primary-foreground">
                            npm install -g bragdoc-cli
                          </code>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-primary-foreground/90">
                          Create your free account
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-primary-foreground/90">
                          Start tracking achievements automatically
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="link"
                    className="h-auto p-0 text-primary-foreground/80 hover:text-primary-foreground underline text-sm"
                    asChild
                  >
                    <Link href="/get-started">View detailed setup guide →</Link>
                  </Button>
                </Card>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
