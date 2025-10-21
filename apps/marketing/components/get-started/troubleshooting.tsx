import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function Troubleshooting() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-primary/10">
              <AlertCircle className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold">Need Help?</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/cli#installation" className="group">
              <Card className="p-5 transition-all hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-medium text-sm block mb-1">
                      CLI installation issues
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Installation troubleshooting guide
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" />
                </div>
              </Card>
            </Link>

            <Link href="/cli#authentication" className="group">
              <Card className="p-5 transition-all hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-medium text-sm block mb-1">
                      Authentication problems
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Fix login and token issues
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" />
                </div>
              </Card>
            </Link>

            <Link href="/cli#llm-providers" className="group">
              <Card className="p-5 transition-all hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-medium text-sm block mb-1">
                      LLM configuration help
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Setup guides for all providers
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" />
                </div>
              </Card>
            </Link>

            <Link href="/cli#troubleshooting" className="group">
              <Card className="p-5 transition-all hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-medium text-sm block mb-1">
                      Can't see my achievements
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Sync and visibility solutions
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" />
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
