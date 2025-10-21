import { Button } from '@/components/ui/button';
import { MessageCircle, BookOpen } from 'lucide-react';
import Link from 'next/link';

export function FaqCta() {
  return (
    <div className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Still have questions?
          </h2>
          <p className="text-lg text-muted-foreground">We're here to help</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" className="gap-2" asChild>
              <a href="mailto:support@bragdoc.ai">
                <MessageCircle className="h-5 w-5" />
                Contact Support
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 bg-transparent"
              asChild
            >
              <Link href="/cli">
                <BookOpen className="h-5 w-5" />
                Read Documentation
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
