import { Card } from '@/components/ui/card';
import { Zap, Shield, Calendar, Github } from 'lucide-react';

const philosophies = [
  {
    icon: Zap,
    title: 'Automatic Beats Manual',
    points: [
      'Manual tracking fails because humans forget',
      'Automatic extraction from git commits is reliable',
      'Your commit history is a perfect record of what you built',
    ],
  },
  {
    icon: Shield,
    title: 'Privacy First',
    points: [
      'I would never use a tool that sent my code to the cloud',
      'BragDoc was designed for developers by a developer',
      'Your code stays on your machine, always',
    ],
  },
  {
    icon: Calendar,
    title: 'Career-Long Investment',
    points: [
      "This isn't a monthly subscription you'll cancel",
      'This is a career-long archive of your professional growth',
      "In 10 years, you'll have a complete record of your impact",
    ],
  },
  {
    icon: Github,
    title: 'Open Source',
    points: [
      'Proprietary tools for career records felt wrong',
      'Open source means transparency, trust, and longevity',
      "Fork it, self-host it, audit it - it's yours",
    ],
  },
];

export function PhilosophySection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          The Solution Philosophy
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {philosophies.map((philosophy, index) => {
            const Icon = philosophy.icon;
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
                      {philosophy.title}
                    </h3>
                    <ul className="space-y-2">
                      {philosophy.points.map((point, i) => (
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
