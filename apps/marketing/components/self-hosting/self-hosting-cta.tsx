import { Button } from '@/components/ui/button';
import { Github, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export function SelfHostingCTA() {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Self-Host BragDoc?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Get started with the open source version today, or reach out if you
            need help with your setup
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <a
                href="https://github.com/yourusername/bragdoc"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="mr-2 h-5 w-5" />
                View on GitHub
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="mailto:support@bragdoc.ai">
                <MessageCircle className="mr-2 h-5 w-5" />
                Get Help
              </a>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-8">
            Prefer a managed solution?{' '}
            <Link href="/pricing" className="text-primary hover:underline">
              Check out our cloud hosting
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
