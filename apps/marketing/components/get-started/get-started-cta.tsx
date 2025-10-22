import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function GetStartedCTA() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Need Help?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            We're here to support you
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/cli">View Documentation</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="mailto:support@bragdoc.ai">Contact Support</a>
            </Button>
          </div>
          <div className="mt-6">
            <Link
              href="#community"
              className="text-sm text-primary hover:underline"
            >
              Join Community (Discord/Slack) →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
