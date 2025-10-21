import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function AboutCTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto max-w-3xl text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6">
          Start Building Your Achievement History
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="text-base px-8" asChild>
            <a href="https://app.bragdoc.ai/login">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base px-8 bg-transparent"
            asChild
          >
            <Link href="/cli">Read the Documentation</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
