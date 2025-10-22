import { Card } from '@/components/ui/card';
import { EyeOff, Brain, TrendingDown, Clock } from 'lucide-react';

const problems = [
  {
    icon: EyeOff,
    title: 'Knowledge Work is Invisible',
    points: [
      "Unlike manufacturing or sales, your impact doesn't create physical artifacts",
      'At the end of the day, what do you have to show for your work?',
      'Commits disappear into history, tickets get closed, your impact fades',
    ],
  },
  {
    icon: Brain,
    title: 'The Forgetting Curve',
    points: [
      'Remember what you did 3 months ago? How about 6 months?',
      'When performance review time comes, you scramble to remember',
      'Your memory favors recent work, erasing historical impact',
    ],
  },
  {
    icon: TrendingDown,
    title: 'Undervaluing Your Work',
    points: [
      'Without records, you undersell your contributions',
      'Promotions and raises go to those who can articulate impact',
      "Your manager doesn't know what they don't see documented",
    ],
  },
  {
    icon: Clock,
    title: 'The Standup Problem',
    points: [
      "9 AM standup, you can't remember what you did yesterday",
      'You fumble through vague descriptions',
      'You appear less productive than you actually are',
    ],
  },
];

export function ProblemSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          The Problem
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 size-12 rounded-lg bg-[oklch(0.65_0.25_262)]/10 dark:bg-[oklch(0.7_0.25_262)]/10 flex items-center justify-center">
                    <Icon className="size-6 text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-3">
                      {problem.title}
                    </h3>
                    <ul className="space-y-2">
                      {problem.points.map((point, i) => (
                        <li
                          key={i}
                          className="text-muted-foreground leading-relaxed"
                        >
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
