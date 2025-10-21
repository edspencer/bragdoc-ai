import { Card } from '@/components/ui/card';

const differences = [
  {
    title: 'Not Just a TODO App',
    points: [
      'Achievements ≠ tasks completed',
      'BragDoc tracks impact, not just activity',
      'AI understands significance, not just what you did',
    ],
  },
  {
    title: 'Not Just a Journal',
    points: [
      'Manual journaling fails because life gets busy',
      'BragDoc runs silently in the background',
      'Set it up once, benefits for years',
    ],
  },
  {
    title: 'Not Just Performance Review Prep',
    points: [
      'Daily standups need this too',
      'Weekly 1-on-1s with your manager',
      'Monthly updates to leadership',
      'Quarterly goal setting and retrospectives',
    ],
  },
];

export function DifferenceSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          What Makes BragDoc Different
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {differences.map((difference, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-4 text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)]">
                {difference.title}
              </h3>
              <ul className="space-y-3">
                {difference.points.map((point, i) => (
                  <li key={i} className="text-muted-foreground leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
