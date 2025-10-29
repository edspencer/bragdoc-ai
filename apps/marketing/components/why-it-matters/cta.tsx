import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Terminal } from 'lucide-react';
import Link from 'next/link';
import { loginPath } from '@/lib/utils';

export function WhyItMattersCTA() {
  const loginUrl = loginPath();
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-4xl">
        <Card className="p-12 space-y-8 bg-primary text-primary-foreground border-0">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-balance">
              Ready to Never Miss a Win?
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed">
              Join thousands of developers who are building their achievement
              history automatically.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="text-base h-14 px-8 font-semibold group"
              asChild
            >
              <a href={loginUrl}>
                Start Tracking Free
                <ArrowRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base h-14 px-8 bg-transparent border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              asChild
            >
              <Link href="/get-started">See Setup Guide</Link>
            </Button>
          </div>

          <div className="pt-8 border-t border-primary-foreground/20">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-primary-foreground/80 justify-center">
                <Terminal className="size-4" />
                <span className="font-semibold">2-Minute Setup:</span>
              </div>
              <div className="bg-primary-foreground/10 rounded-lg p-4 font-mono text-sm max-w-md mx-auto">
                <code className="text-primary-foreground">
                  npm install -g @bragdoc/cli
                </code>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
