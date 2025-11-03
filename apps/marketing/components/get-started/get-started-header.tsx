import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function GetStartedHeader() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)]" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <Badge
            variant="secondary"
            className="mb-6 bg-primary/10 text-primary border-primary/20"
          >
            <Sparkles className="size-3 mr-1.5" />
            Quick Setup
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-6">
            Get Started with BragDoc: Track Achievements in Minutes
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground text-balance leading-relaxed">
            Get started with BragDoc in 5 simple steps using the CLI and local
            AI configuration
          </p>
        </div>
      </div>
    </section>
  );
}
