import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

export function PrivacyHeader() {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 gap-2">
            <Shield className="h-3 w-3" />
            Open Source & Auditable
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-balance">
            Privacy First - How BragDoc Protects Your Code and Data
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground text-balance">
            We believe your code and work should be completely private
          </p>
        </div>
      </div>
    </section>
  );
}
