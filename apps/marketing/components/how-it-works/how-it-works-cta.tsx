import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Terminal } from 'lucide-react';

export function HowItWorksCTA() {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Start?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Set up takes less than 5 minutes
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <a href="https://app.bragdoc.ai/login">
                Get Started Free
                <ArrowRight className="ml-2 size-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/cli">
                <Terminal className="mr-2 size-4" />
                View CLI Documentation
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
