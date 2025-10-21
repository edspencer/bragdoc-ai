import {
  Server,
  Cpu,
  Database,
  Shield,
  ArrowRight,
  Lock,
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
              <Lock className="h-3 w-3 mr-1" />
              Privacy-First Design
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Three-Layer Privacy Architecture
            </h2>
            <p className="text-lg text-muted-foreground text-balance max-w-2xl mx-auto">
              A clear separation between your code, AI processing, and cloud
              storage.
            </p>
          </div>

          {/* Horizontal Timeline Style */}
          <div className="relative mb-16">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 opacity-20" />

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Layer 1 */}
              <div className="relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    1
                  </div>
                </div>
                <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent hover:border-green-500/50 transition-all hover:shadow-lg hover:shadow-green-500/10">
                  <CardContent className="pt-12 pb-6">
                    <div className="text-center space-y-4">
                      <div className="inline-flex h-16 w-16 rounded-xl bg-green-500/10 items-center justify-center mb-2">
                        <Server className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-xl font-bold">Local Machine</h3>
                      <p className="text-sm text-muted-foreground">
                        Your code repository
                      </p>
                      <div className="pt-4 space-y-2 text-left">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          <span>Git commits analyzed</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          <span>Code never leaves</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          <span>CLI extracts metadata</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Layer 2 */}
              <div className="relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    2
                  </div>
                </div>
                <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10">
                  <CardContent className="pt-12 pb-6">
                    <div className="text-center space-y-4">
                      <div className="inline-flex h-16 w-16 rounded-xl bg-blue-500/10 items-center justify-center mb-2">
                        <Cpu className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold">AI Processing</h3>
                      <p className="text-sm text-muted-foreground">
                        Your chosen LLM provider
                      </p>
                      <div className="pt-4 space-y-2 text-left">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          <span>OpenAI, Anthropic, etc.</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          <span>Or local Ollama</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          <span>Your API keys</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Layer 3 */}
              <div className="relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    3
                  </div>
                </div>
                <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-transparent hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/10">
                  <CardContent className="pt-12 pb-6">
                    <div className="text-center space-y-4">
                      <div className="inline-flex h-16 w-16 rounded-xl bg-purple-500/10 items-center justify-center mb-2">
                        <Database className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="text-xl font-bold">Cloud Storage</h3>
                      <p className="text-sm text-muted-foreground">
                        BragDoc secure database
                      </p>
                      <div className="pt-4 space-y-2 text-left">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                          <span>Achievements only</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                          <span>No source code</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                          <span>Encrypted at rest</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Self-Hosted Callout */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            <div className="relative flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Shield className="h-10 w-10 text-primary" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                  <h3 className="text-2xl font-bold">
                    Skip the Cloud Entirely
                  </h3>
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <p className="text-muted-foreground mb-4">
                  Self-host everything on your infrastructure with local Ollama
                  for complete privacy
                </p>
                <Button asChild>
                  <Link href="/self-hosting">
                    Explore Self-Hosting
                    <ArrowRight className="ml-2 h-4 w-4" />
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
