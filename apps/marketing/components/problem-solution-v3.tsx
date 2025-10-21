'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle,
  CheckCircle2,
  Zap,
  Terminal,
  Globe,
} from 'lucide-react';

export function ProblemSolutionV3() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            From Invisible Work to Undeniable Impact
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stop losing track of your achievements. Start building your career
            story.
          </p>
        </div>

        <div className="relative">
          {/* Problem Side */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-bold">Without BragDoc</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <ProblemItem text="Forget achievements by review time" />
              <ProblemItem text="No visibility into daily impact" />
              <ProblemItem text="Scramble for evidence during reviews" />
              <ProblemItem text="Undersell your contributions" />
            </div>
          </div>

          {/* Divider with VS */}
          <div className="relative py-6 mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-sm font-semibold text-muted-foreground">
                VS
              </span>
            </div>
          </div>

          {/* Solution Side */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-bold">With BragDoc</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary flex-shrink-0">
                      <Terminal className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        Auto-Extract
                        <Zap className="h-4 w-4 text-primary" />
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        CLI analyzes your commits and extracts achievements
                        automatically
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary flex-shrink-0">
                      <Globe className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        Organize & Report
                        <Zap className="h-4 w-4 text-primary" />
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Web dashboard to review, tag, and generate reports for
                        any occasion
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemItem({ text }: { text: string }) {
  return (
    <Card className="p-4 border-destructive/20 bg-destructive/5">
      <div className="flex items-start gap-2">
        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0" />
        <span className="text-sm text-muted-foreground leading-relaxed">
          {text}
        </span>
      </div>
    </Card>
  );
}
