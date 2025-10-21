import {
  Laptop,
  Zap,
  CloudCog,
  Shield,
  Lock,
  CheckCircle2,
  ArrowDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function PrivacyArchitectureV3() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4 border border-primary/20">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-semibold">
                Privacy Architecture
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Your Data Journey
            </h2>
            <p className="text-lg text-muted-foreground text-balance max-w-2xl mx-auto">
              Follow the path from your local code to secure cloud storage.
            </p>
          </div>

          {/* Vertical Flow */}
          <div className="space-y-6 mb-12">
            {/* Step 1 */}
            <div className="relative">
              <Card className="border-2 border-green-500/40 bg-green-500/5 overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-green-500" />
                <CardContent className="pt-6 pb-6 pl-8">
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0 h-14 w-14 rounded-xl bg-green-500/10 flex items-center justify-center border-2 border-green-500/30">
                      <Laptop className="h-7 w-7 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">
                          Your Local Machine
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-300 text-xs font-semibold">
                          PRIVATE
                        </span>
                      </div>
                      <p className="text-muted-foreground mb-4">
                        The CLI analyzes your git commits locally. Your source
                        code never leaves your computer.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span>Code stays local</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span>Metadata extracted</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="flex justify-center py-3">
                <ArrowDown className="h-6 w-6 text-muted-foreground animate-bounce" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <Card className="border-2 border-blue-500/40 bg-blue-500/5 overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
                <CardContent className="pt-6 pb-6 pl-8">
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0 h-14 w-14 rounded-xl bg-blue-500/10 flex items-center justify-center border-2 border-blue-500/30">
                      <Zap className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">
                          AI Processing Layer
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                          YOUR CHOICE
                        </span>
                      </div>
                      <p className="text-muted-foreground mb-4">
                        Commit messages are sent to your chosen LLM provider for
                        intelligent analysis.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span>Your API keys</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span>Local Ollama option</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="flex justify-center py-3">
                <ArrowDown className="h-6 w-6 text-muted-foreground animate-bounce" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <Card className="border-2 border-purple-500/40 bg-purple-500/5 overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-purple-500" />
                <CardContent className="pt-6 pb-6 pl-8">
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0 h-14 w-14 rounded-xl bg-purple-500/10 flex items-center justify-center border-2 border-purple-500/30">
                      <CloudCog className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">BragDoc Cloud</h3>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                          SECURE
                        </span>
                      </div>
                      <p className="text-muted-foreground mb-4">
                        Only your achievements are stored in the cloud. Access
                        them anywhere via the web app.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          <span>Achievements only</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          <span>Encrypted storage</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Self-Hosted Alternative */}
          <Card className="border-2 border-primary bg-primary/5">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4">
                <div className="inline-flex h-16 w-16 rounded-2xl bg-primary/10 items-center justify-center mb-2">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Or Go Fully Self-Hosted</h3>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Run the entire stack on your infrastructure with zero cloud
                  dependencies. Perfect for maximum privacy.
                </p>
                <Button asChild size="lg">
                  <Link href="/self-hosting">View Self-Hosting Guide</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
