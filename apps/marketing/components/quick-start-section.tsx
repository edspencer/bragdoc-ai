import Link from 'next/link';
import { Terminal, UserPlus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CodeBlock } from '@/components/code-block';
import { loginPath } from '@/lib/utils';

export function QuickStartSection() {
  const loginUrl = loginPath();
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-lg text-muted-foreground">
              Two simple steps to start tracking your achievements
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Step 1: Install CLI */}
            <Card className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Terminal className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    1. Install the CLI
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Install BragDoc CLI globally using npm
                  </p>
                </div>
              </div>
              <CodeBlock code="npm install -g @bragdoc/cli" language="bash" />
            </Card>

            {/* Step 2: Create Account */}
            <Card className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <UserPlus className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    2. Create a Free Account
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sign up at app.bragdoc.ai to sync your achievements and
                    unlock AI features
                  </p>
                </div>
              </div>
              <Button asChild className="w-full">
                <a href={loginUrl} target="_blank" rel="noopener noreferrer">
                  Create Account
                </a>
              </Button>
            </Card>
          </div>

          <div className="text-center">
            <Button asChild variant="outline" size="lg">
              <Link href="/get-started">
                View Full Setup Guide
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
