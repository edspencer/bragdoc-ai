import { Code, Clock, Award, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const examples = [
  {
    title: 'Daily Developer',
    icon: Code,
    description: [
      'Sets up automatic extraction at 6 PM daily',
      'Reviews achievements weekly',
      'Generates monthly report for manager',
    ],
  },
  {
    title: 'Standup Hero',
    icon: Clock,
    description: [
      'CLI runs at 9:45 AM before 10 AM standup',
      'Prepares WIP and recent achievements',
      'Never caught off-guard in meetings',
    ],
  },
  {
    title: 'Performance Review Prep',
    icon: Award,
    description: [
      'Tracks achievements throughout year',
      'Generates quarterly reports',
      'Has complete record for annual review',
    ],
  },
  {
    title: 'Privacy-First User',
    icon: Shield,
    description: [
      'Self-hosted BragDoc instance',
      'Local Ollama for AI',
      '100% offline, zero cloud dependencies',
    ],
  },
];

export function WorkflowExamples() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Real-World Workflow Examples
          </h2>
          <p className="text-lg text-muted-foreground text-center mb-16 text-balance">
            See how different developers use BragDoc in their daily work
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            {examples.map((example) => {
              const Icon = example.icon;
              return (
                <Card
                  key={example.title}
                  className="border-2 hover:border-primary/50 transition-colors"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold pt-2">
                        {example.title}
                      </h3>
                    </div>
                    <ul className="space-y-2 ml-16">
                      {example.description.map((item, i) => (
                        <li
                          key={i}
                          className="text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-primary mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
