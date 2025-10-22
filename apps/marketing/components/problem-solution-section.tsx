import type React from 'react';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Terminal, Globe } from 'lucide-react';

export function ProblemSolutionSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-8 space-y-6 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="size-5" />
              </div>
              <h2 className="text-2xl font-bold">The Problem</h2>
            </div>

            <h3 className="text-xl font-semibold text-balance">
              As a knowledge worker, your impact is invisible
            </h3>

            <ul className="space-y-4">
              <ProblemItem text="You ship features but forget the details by review time" />
              <ProblemItem text="Managers don't see your daily wins and problem-solving" />
              <ProblemItem text="Performance reviews catch you off-guard with no evidence" />
              <ProblemItem text="You undersell yourself because you can't remember what you did" />
            </ul>
          </Card>

          <Card className="p-8 space-y-6 bg-card border-border">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
                <CheckCircle2 className="size-5" />
              </div>
              <h2 className="text-2xl font-bold">The Solution</h2>
            </div>

            <h3 className="text-xl font-semibold text-balance">
              BragDoc tracks your work automatically
            </h3>

            <div className="space-y-6">
              <SolutionItem
                icon={<Terminal className="size-5" />}
                title="CLI Tool"
                description="Run bragdoc in your repo to analyze commits and extract achievements automatically"
              />
              <SolutionItem
                icon={<Globe className="size-5" />}
                title="Web Dashboard"
                description="Review, edit, and organize your achievements in a beautiful interface"
              />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function ProblemItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 size-1.5 rounded-full bg-destructive shrink-0" />
      <span className="text-muted-foreground leading-relaxed">{text}</span>
    </li>
  );
}

function SolutionItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
