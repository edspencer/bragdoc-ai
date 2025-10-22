import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function FaqHeader() {
  return (
    <div className="border-b border-border bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 max-w-4xl">
        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
            Everything you need to know about BragDoc
          </p>

          <div className="max-w-md mx-auto pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search FAQs..."
                className="pl-10 bg-background"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
