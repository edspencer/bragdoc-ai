import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function UseCasesCta() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Find Your Workflow
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            No matter how you work, BragDoc adapts to your needs
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <a href="https://app.bragdoc.ai/login">Get Started Free</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/cli">View Documentation</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
