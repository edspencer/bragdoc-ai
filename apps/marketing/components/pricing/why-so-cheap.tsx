import { Calendar, Scale, Lock, Sprout } from 'lucide-react';

export function WhySoCheap() {
  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          Why So Cheap?
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-[oklch(0.65_0.25_262)]/10 dark:bg-[oklch(0.7_0.25_262)]/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)]" />
              </div>
            </div>
            <h3 className="font-semibold text-lg">Career-long tool</h3>
            <p className="text-sm text-muted-foreground">
              Tremendous long-term value for your entire career
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-[oklch(0.65_0.25_262)]/10 dark:bg-[oklch(0.7_0.25_262)]/10 flex items-center justify-center">
                <Scale className="h-6 w-6 text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)]" />
              </div>
            </div>
            <h3 className="font-semibold text-lg">Fair pricing</h3>
            <p className="text-sm text-muted-foreground">
              Convenience over complexity, not exploitation
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-[oklch(0.65_0.25_262)]/10 dark:bg-[oklch(0.7_0.25_262)]/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)]" />
              </div>
            </div>
            <h3 className="font-semibold text-lg">Privacy-first</h3>
            <p className="text-sm text-muted-foreground">
              We don't monetize your data or sell to third parties
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-[oklch(0.65_0.25_262)]/10 dark:bg-[oklch(0.7_0.25_262)]/10 flex items-center justify-center">
                <Sprout className="h-6 w-6 text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)]" />
              </div>
            </div>
            <h3 className="font-semibold text-lg">Sustainable</h3>
            <p className="text-sm text-muted-foreground">
              Independent, no VC pressure to maximize extraction
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
