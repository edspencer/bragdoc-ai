import { Container } from '@/components/marketing/salient/Container';

const steps = [
  {
    name: 'Capture',
    description:
      'Our AI assistant automatically identifies achievements from your daily work conversations and Git activity.',
  },
  {
    name: 'Organize',
    description:
      'Achievements are automatically categorized and enriched with relevant context and metrics.',
  },
  {
    name: 'Review',
    description:
      'Regular summaries help you reflect on your progress and identify areas for growth.',
  },
  {
    name: 'Present',
    description:
      'Generate polished performance review documents and career narratives with one click.',
  },
];

export function WhyProcess() {
  return (
    <section id="process" aria-label="Our process" className="py-20 sm:py-32">
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Effortless Achievement Tracking
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            No more manual tracking or forgotten accomplishments. Our AI-powered
            assistant makes maintaining your brag document completely
            effortless.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {steps.map((step, stepIdx) => (
              <div
                key={step.name}
                className="relative pl-16 lg:pl-0 lg:text-center"
              >
                <div
                  className={`absolute left-0 top-0 flex size-10 items-center justify-center rounded-full border-2 ${
                    stepIdx === steps.length - 1
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-blue-600/10 bg-blue-600/10 text-blue-600'
                  } text-sm font-semibold lg:relative lg:mx-auto`}
                >
                  {stepIdx + 1}
                </div>
                <h3 className="mt-6 text-base font-semibold leading-7 text-slate-900 dark:text-slate-100 lg:mt-8">
                  {step.name}
                </h3>
                <p className="mt-2 text-base leading-7 text-slate-600 dark:text-slate-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
