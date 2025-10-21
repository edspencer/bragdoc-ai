'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Check,
  Code,
  Users,
  Briefcase,
  Move,
  Home,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const useCases = [
  {
    icon: Code,
    title: 'Software Developers',
    problem: [
      'Too busy coding to document accomplishments',
      'Standups catch you off-guard',
      'Performance reviews require memory archeology',
    ],
    helps: [
      'CLI automatically extracts achievements from commits',
      'Standup mode prepares notes 10 minutes before meeting',
      'Performance review time: 6 months of work documented',
      'Promotion packet: specific, quantified achievements',
    ],
    workflow: [
      'Install CLI, set up automatic extraction (daily at 6 PM)',
      'Enable standup mode for 9:45 AM daily',
      'Review achievements weekly in web app',
      'Generate monthly report for manager',
      'At review time: export 6-12 months of achievements',
    ],
  },
  {
    icon: Users,
    title: 'Engineering Managers',
    problem: [
      'Tracking your own contributions while managing others',
      'Preparing skip-level reports',
      'Communicating team impact to leadership',
    ],
    helps: [
      'Track your own code contributions',
      'Manual achievement entry for management work',
      'Generate leadership reports',
      'Standups: show your work alongside team updates',
    ],
    workflow: [
      'CLI tracks your code commits',
      'Manually log: "Hired 2 senior engineers", "Reduced sprint velocity variability by 30%"',
      'Organize achievements by category: Technical, People, Process',
      'Monthly: Generate report for director',
    ],
  },
  {
    icon: Briefcase,
    title: 'Freelancers & Consultants',
    problem: [
      'Multiple concurrent clients and projects',
      'Need to demonstrate ROI to clients',
      'Portfolio building for new client acquisition',
    ],
    helps: [
      'Multi-repository support (one repo per client)',
      'Company management (track all clients)',
      'Per-client achievement summaries',
      'Generate client-specific reports',
    ],
    workflow: [
      'Add each client project: `bragdoc projects add ~/clients/acme`',
      'Organize achievements by company (client)',
      'Generate monthly reports per client',
      'Portfolio building: export all achievements by client',
    ],
  },
  {
    icon: Move,
    title: 'Career Transitioners',
    problem: [
      'Resume needs to demonstrate impact, not just responsibilities',
      'Interviews require specific examples (STAR method)',
      'Forgetting past achievements from previous roles',
    ],
    helps: [
      'Years of documented achievements for resume building',
      'Specific examples ready for behavioral interviews',
      'Quantified impact statements for resume bullets',
      'Data export for resume generation tools',
    ],
    workflow: [
      'Track achievements continuously throughout current role',
      'At job search time: filter last 2-3 years',
      'Export high-impact achievements',
      'Craft resume bullets from documented achievements',
      'Interview prep: review by competency area',
    ],
  },
  {
    icon: Home,
    title: 'Remote Workers',
    problem: [
      "Visibility challenge: manager doesn't see you working",
      'Async communication requires clear updates',
      'Need to over-communicate impact without seeming boastful',
    ],
    helps: [
      'Automatic tracking provides receipts for work done',
      'Weekly reports keep manager informed',
      'Standup notes perfect for async standup channels',
      'Data-driven visibility into contributions',
    ],
    workflow: [
      'Automatic extraction runs daily',
      'Friday: Generate weekly report, send to manager',
      'Async standup: Use standup mode to generate update',
      'Monthly 1-on-1: Reference achievement dashboard',
    ],
  },
  {
    icon: Shield,
    title: 'Privacy-Conscious Enterprise Developers',
    problem: [
      'Cannot use cloud tools due to security policies',
      'Proprietary code cannot be processed by external APIs',
      'Need achievement tracking without compromising IP',
    ],
    helps: [
      'Self-host BragDoc web app on-premise',
      'CLI uses local Ollama LLM (nothing leaves network)',
      '100% air-gapped deployment possible',
      'Open source for security audits',
    ],
    workflow: [
      'Deploy BragDoc to internal Kubernetes cluster',
      'Install Ollama on developer machines',
      'Configure CLI to use local Ollama and on-premise BragDoc',
      'Extract achievements without any external API calls',
    ],
  },
];

export function UseCaseCards() {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const toggleCard = (index: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCards(newExpanded);
  };

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 max-w-7xl mx-auto">
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon;
            const isExpanded = expandedCards.has(index);

            return (
              <Card key={index} className="relative overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-6" />
                      </div>
                      <CardTitle className="text-2xl">
                        {useCase.title}
                      </CardTitle>
                    </div>
                    <button
                      onClick={() => toggleCard(index)}
                      className="md:hidden flex size-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      <ChevronDown
                        className={cn(
                          'h-5 w-5 transition-transform',
                          isExpanded && 'rotate-180',
                        )}
                      />
                    </button>
                  </div>
                </CardHeader>
                <CardContent
                  className={cn('space-y-6', !isExpanded && 'max-md:hidden')}
                >
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-destructive">
                      The Problem
                    </h3>
                    <ul className="space-y-2">
                      {useCase.problem.map((item, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-destructive mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-primary">
                      How BragDoc Helps
                    </h3>
                    <ul className="space-y-2">
                      {useCase.helps.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <Check className="size-4 text-primary mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Workflow</h3>
                    <ol className="space-y-2">
                      {useCase.workflow.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-3">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            {i + 1}
                          </span>
                          <span className="pt-0.5">{item}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="pt-4">
                    <div className="aspect-video rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm">
                      Screenshot placeholder
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
