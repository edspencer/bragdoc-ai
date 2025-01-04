import { Container } from '@/components/marketing/salient/Container';

const stats = [
  {
    number: '78%',
    description:
      'of professionals underreport their achievements in performance reviews',
  },
  {
    number: '3.5x',
    description:
      'more likely to receive a promotion when keeping a brag document',
  },
  {
    number: '92%',
    description:
      'of managers value documented achievements in promotion decisions',
  },
  {
    number: '45%',
    description:
      'higher salary increases for employees who track accomplishments',
  },
];

export function WhyStats() {
  return (
    <section
      id="stats"
      aria-label="Success statistics"
      className="bg-slate-50 dark:bg-slate-900 py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            The Numbers Don&apos;t Lie
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            Research shows that professionals who maintain brag documents
            consistently outperform their peers in career advancement.
          </p>
        </div>
        <dl className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.number} className="flex flex-col items-center">
              <dt className="font-display text-4xl font-medium text-blue-600">
                {stat.number}
              </dt>
              <dd className="mt-3 text-center text-sm text-slate-700 dark:text-slate-300">
                {stat.description}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
