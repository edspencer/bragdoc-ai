import {
  Monitor,
  Brain,
  Cloud,
  Shield,
  ArrowRight,
  Lock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function PrivacyArchitectureV2() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
              <Lock className="size-3 mr-1" />
              Privacy-First Architecture
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Three-Layer Privacy Architecture
            </h2>
            <p className="text-lg text-muted-foreground text-balance max-w-2xl mx-auto">
              Your code stays on your machine. Only achievements are stored in
              the cloud.
            </p>
          </div>

          {/* Visual Flow Diagram */}
          <div className="mb-16">
            <div className="relative">
              {/* Flow Diagram */}
              <div className="grid md:grid-cols-3 gap-4 md:gap-8 items-center">
                {/* Step 1: Your Machine */}
                <div className="relative">
                  <Card className="border-2 border-green-500/50 bg-green-500/5 hover:border-green-500 transition-colors">
                    <CardContent className="py-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="size-20 rounded-2xl bg-green-500/10 flex items-center justify-center ring-4 ring-green-500/20">
                          <Monitor className="size-10 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold mb-2">
                            Your Machine
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Git repositories analyzed locally
                          </p>
                        </div>
                        <div className="w-full space-y-2 text-left">
                          <div className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">
                              Code stays here
                            </span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">
                              CLI extracts metadata
                            </span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">
                              Never uploaded
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Arrow */}
                  <div className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 z-10">
                    <ArrowRight className="size-8 text-primary" />
                  </div>
                </div>

                {/* Step 2: Your LLM */}
                <div className="relative">
                  <Card className="border-2 border-blue-500/50 bg-blue-500/5 hover:border-blue-500 transition-colors">
                    <CardContent className="py-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="size-20 rounded-2xl bg-blue-500/10 flex items-center justify-center ring-4 ring-blue-500/20">
                          <Brain className="size-10 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold mb-2">Your LLM</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            AI analyzes commit messages
                          </p>
                        </div>
                        <div className="w-full space-y-2 text-left">
                          <div className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">
                              You choose provider
                            </span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">
                              Your API key
                            </span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">
                              Or use local Ollama
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Arrow */}
                  <div className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 z-10">
                    <ArrowRight className="size-8 text-primary" />
                  </div>
                </div>

                {/* Step 3: BragDoc Cloud */}
                <div className="relative">
                  <Card className="border-2 border-purple-500/50 bg-purple-500/5 hover:border-purple-500 transition-colors">
                    <CardContent className="py-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="size-20 rounded-2xl bg-purple-500/10 flex items-center justify-center ring-4 ring-purple-500/20">
                          <Cloud className="size-10 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold mb-2">
                            BragDoc Cloud
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Achievements stored securely
                          </p>
                        </div>
                        <div className="w-full space-y-2 text-left">
                          <div className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="size-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">
                              Only achievements
                            </span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="size-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">
                              Web app access
                            </span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="size-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">
                              Document generation
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          {/* Self-Hosted Callout */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-8">
            <div className="absolute top-0 right-0 size-64 bg-primary/5 rounded-full blur-3xl" />
            <div className="relative flex flex-col md:flex-row items-center gap-6">
              <div className="shrink-0">
                <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Shield className="size-10 text-primary" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                  <h3 className="text-2xl font-bold">
                    Skip the Cloud Entirely
                  </h3>
                  <Sparkles className="size-5 text-primary" />
                </div>
                <p className="text-muted-foreground mb-4">
                  Self-host everything on your infrastructure with local Ollama
                  for complete privacy
                </p>
                <Button asChild>
                  <Link href="/self-hosting">
                    Explore Self-Hosting
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
