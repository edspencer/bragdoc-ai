import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Terminal, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export function CTASectionV3() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-balance">
            Start Building Your Achievement History Today
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Join thousands of developers who never miss a win
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {/* Benefit cards */}
          <Card className="p-6 space-y-3 border-2 hover:border-primary/50 transition-colors">
            <div className="size-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Check className="size-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-lg">Automatic Tracking</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Never manually log achievements again. BragDoc extracts them from
              your Git commits.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-2 hover:border-primary/50 transition-colors">
            <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="size-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg">Career Growth</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Generate reports for managers and create compelling performance
              review documentation.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-2 hover:border-primary/50 transition-colors">
            <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Terminal className="size-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-lg">2-Minute Setup</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Install the CLI, create an account, and start tracking. It's that
              simple.
            </p>
          </Card>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button
            size="lg"
            className="text-base h-14 px-10 font-semibold"
            asChild
          >
            <a href="https://app.bragdoc.ai/login">Start Tracking Free</a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base h-14 px-10 bg-transparent"
            asChild
          >
            <Link href="/how-it-works">See How It Works</Link>
          </Button>
        </div>

        {/* Quick install */}
        <Card className="max-w-2xl mx-auto p-6 bg-muted/50">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="size-5 text-muted-foreground" />
            <span className="font-semibold text-sm">Quick Install</span>
          </div>
          <div className="bg-background rounded-lg p-4 font-mono text-sm border">
            <code>npm install -g bragdoc-cli</code>
          </div>
          <p className="text-sm text-muted-foreground text-center mt-3">
            Or{' '}
            <Button variant="link" className="h-auto p-0 text-sm" asChild>
              <Link href="/get-started">view detailed setup guide</Link>
            </Button>
          </p>
        </Card>
      </div>
    </section>
  );
}
