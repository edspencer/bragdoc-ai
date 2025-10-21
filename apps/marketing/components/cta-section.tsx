import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Terminal } from 'lucide-react';
import Link from 'next/link';

export function CTASection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-4xl">
        <Card className="p-12 space-y-8 bg-primary text-primary-foreground border-0">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-balance">
              Start Building Your Achievement History Today
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed">
              Join thousands of developers who never miss a win. Get started in
              under 2 minutes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="text-base h-12 px-8"
              asChild
            >
              <a href="https://app.bragdoc.ai/login">Start Tracking Free</a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base h-12 px-8 bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
              asChild
            >
              <Link href="/how-it-works">See How It Works</Link>
            </Button>
          </div>

          <div className="pt-8 border-t border-primary-foreground/20">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <Terminal className="h-4 w-4" />
                <span className="font-semibold">Quick Install:</span>
              </div>
              <div className="bg-primary-foreground/10 rounded-lg p-4 font-mono text-sm">
                <code className="text-primary-foreground">
                  npm install -g bragdoc-cli
                </code>
              </div>
              <p className="text-sm text-primary-foreground/60 text-center">
                Or{' '}
                <Button
                  variant="link"
                  className="h-auto p-0 text-primary-foreground underline"
                  asChild
                >
                  <Link href="/cli">view installation docs</Link>
                </Button>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
