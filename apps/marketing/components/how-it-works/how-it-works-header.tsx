import { ArrowRight } from 'lucide-react';

export function HowItWorksHeader() {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-6">
            How BragDoc Works: Automated Achievement Tracking from Git
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground text-balance mb-4">
            From Commits to Career Documents
          </p>
          <p className="text-lg text-muted-foreground text-balance mb-12">
            BragDoc is a two-part system: powerful CLI + beautiful web interface
          </p>

          {/* Flow Diagram */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap text-sm sm:text-base">
            <div className="px-4 py-2 rounded-lg bg-muted font-medium">
              Git Commits
            </div>
            <ArrowRight className="size-5 text-muted-foreground shrink-0" />
            <div className="px-4 py-2 rounded-lg bg-muted font-medium">CLI</div>
            <ArrowRight className="size-5 text-muted-foreground shrink-0" />
            <div className="px-4 py-2 rounded-lg bg-primary/10 text-primary font-medium">
              AI
            </div>
            <ArrowRight className="size-5 text-muted-foreground shrink-0" />
            <div className="px-4 py-2 rounded-lg bg-muted font-medium">
              Web App
            </div>
            <ArrowRight className="size-5 text-muted-foreground shrink-0" />
            <div className="px-4 py-2 rounded-lg bg-muted font-medium">
              Documents
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
