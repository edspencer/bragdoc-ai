import { Shield, Github } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function SelfHostingHeader() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 px-4 py-2">
            <Shield className="h-4 w-4 mr-2" />
            100% Self-Hosted
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-balance">
            Self-Host BragDoc on Your Infrastructure
          </h1>

          <p className="text-xl text-muted-foreground mb-8 text-balance max-w-3xl mx-auto leading-relaxed">
            Run BragDoc entirely on your own servers with complete control over
            your data. No cloud dependencies, no monthly fees, just pure open
            source freedom.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              <span>Open Source</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span>Complete Privacy</span>
            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span>No Vendor Lock-in</span>
            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span>Free Forever</span>
          </div>
        </div>
      </div>
    </section>
  );
}
