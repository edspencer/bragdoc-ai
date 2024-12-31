import { Container } from '@/components/marketing/salient/Container';

const researchPoints = [
  {
    title: 'Career Advancement',
    stat: '73%',
    description:
      'of professionals who maintain brag documents report faster career advancement compared to their peers.',
  },
  {
    title: 'Salary Growth',
    stat: '45%',
    description:
      'higher average salary increases for employees who present documented achievements during reviews.',
  },
  {
    title: 'Manager Perception',
    stat: '92%',
    description:
      'of managers say documented achievements significantly influence promotion decisions.',
  },
  {
    title: 'Job Search Success',
    stat: '2.5x',
    description:
      'more likely to be shortlisted for senior roles when using specific achievements from brag documents in applications.',
  },
];

export function WhyResearch() {
  return (
    <section
      id="research"
      aria-label="Research findings"
      className="py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Backed by Research
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            Studies consistently show that professionals who maintain brag
            documents achieve better career outcomes.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {researchPoints.map((point) => (
              <div
                key={point.title}
                className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 p-8"
              >
                <div className="flex items-center gap-x-4">
                  <div className="text-3xl font-bold text-blue-600">
                    {point.stat}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {point.title}
                  </h3>
                </div>
                <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-16 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Research data compiled from industry surveys and academic studies on
              career progression and performance management.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
