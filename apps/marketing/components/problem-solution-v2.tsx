'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { XCircle, Sparkles, Terminal, Globe, ArrowRight } from 'lucide-react';

export function ProblemSolutionV2() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        {/* Problem Section */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <Badge variant="destructive" className="text-sm px-3 py-1">
              The Problem
            </Badge>
          </div>
          <h2 className="text-4xl font-bold mb-6 text-balance">
            Your impact is invisible—until it's too late
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <ProblemCard
              title="Forgotten Achievements"
              description="You ship features but forget the details by review time"
            />
            <ProblemCard
              title="Invisible Daily Wins"
              description="Managers don't see your problem-solving and daily contributions"
            />
            <ProblemCard
              title="Review Panic"
              description="Performance reviews catch you off-guard with no evidence"
            />
            <ProblemCard
              title="Underselling Yourself"
              description="You can't remember what you did, so you undersell your impact"
            />
          </div>
        </div>

        {/* Arrow Divider */}
        <div className="flex justify-center mb-16">
          <div className="flex items-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-border" />
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ArrowRight className="h-6 w-6" />
            </div>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-border" />
          </div>
        </div>

        {/* Solution Section */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <Badge className="text-sm px-3 py-1 bg-primary">The Solution</Badge>
          </div>
          <h2 className="text-4xl font-bold mb-6 text-balance">
            BragDoc tracks your work automatically
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/40 transition-colors">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
                <Terminal className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3">CLI Tool</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Run{' '}
                <code className="px-2 py-1 bg-muted rounded text-sm">
                  bragdoc extract
                </code>{' '}
                in your repo to analyze commits and extract achievements
                automatically
              </p>
              <ul className="space-y-2">
                <SolutionFeature text="Analyzes git commits with AI" />
                <SolutionFeature text="Extracts meaningful achievements" />
                <SolutionFeature text="Works with any git repository" />
              </ul>
            </Card>

            <Card className="p-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/40 transition-colors">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
                <Globe className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Web Dashboard</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Organize achievements and generate compelling reports for
                managers and performance reviews to advance your career
              </p>
              <ul className="space-y-2">
                <SolutionFeature text="Tag and categorize achievements" />
                <SolutionFeature text="Generate reports for your manager" />
                <SolutionFeature text="Create performance review documentation" />
                <SolutionFeature text="Track impact over time" />
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemCard({
  title,
  description,
}: { title: string; description: string }) {
  return (
    <Card className="p-6 border-destructive/20 bg-destructive/5 hover:border-destructive/40 transition-colors">
      <div className="flex items-start gap-3">
        <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );
}

function SolutionFeature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
      <span className="text-muted-foreground">{text}</span>
    </li>
  );
}
