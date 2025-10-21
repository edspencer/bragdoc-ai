import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function PrivacyCta() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            See How It Works
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Understand the complete data flow
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/how-it-works">View Documentation</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#privacy-policy">Read Privacy Policy</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
