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
import { Github, Code, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

export function OpenSourceSection() {
  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-[oklch(0.65_0.25_262)] dark:bg-[oklch(0.7_0.25_262)]">
              <Github className="size-3 mr-1" />
              Open Source
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Don't Want to Pay? Self-Host for Free
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              BragDoc is fully open source. Run it locally with your own
              infrastructure and AI provider.
            </p>
          </div>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Code className="size-6" />
                Open Source Self-Hosting
              </CardTitle>
              <CardDescription>
                Complete control, zero subscription costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                  <Shield className="size-8 mb-2 text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)]" />
                  <h4 className="font-semibold mb-1">100% Private</h4>
                  <p className="text-sm text-muted-foreground">
                    Your code never leaves your machine
                  </p>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                  <Zap className="size-8 mb-2 text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)]" />
                  <h4 className="font-semibold mb-1">Use Any LLM</h4>
                  <p className="text-sm text-muted-foreground">
                    Ollama, OpenAI, Anthropic, or custom
                  </p>
                </div>
                <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                  <Github className="size-8 mb-2 text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)]" />
                  <h4 className="font-semibold mb-1">Fully Auditable</h4>
                  <p className="text-sm text-muted-foreground">
                    Inspect and modify the source code
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">What You Get</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)]">
                      •
                    </span>
                    <span>
                      Full CLI tool with AI extraction (using your own LLM API
                      keys)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)]">
                      •
                    </span>
                    <span>Self-hosted web application (optional)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)]">
                      •
                    </span>
                    <span>
                      All core features: achievement tracking, project
                      management, data export
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)]">
                      •
                    </span>
                    <span>Community support via GitHub discussions</span>
                  </li>
                </ul>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Self-hosting requires technical setup
                  and you'll need to provide your own LLM API keys (or use free
                  local Ollama). Cloud-only features like document generation
                  require additional configuration.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                asChild
              >
                <a
                  href="https://github.com/bragdoc/bragdoc"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="size-4 mr-2" />
                  View on GitHub
                </a>
              </Button>
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                asChild
              >
                <Link href="/self-hosting">
                  <Code className="size-4 mr-2" />
                  Self-Hosting Docs
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
