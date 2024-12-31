import { Container } from '@/components/marketing/salient/Container';
import { CheckIcon, CrossCircledIcon } from '@radix-ui/react-icons';

const comparison = {
  manual: {
    title: 'Manual Brag Documents',
    description: 'Traditional way of tracking achievements',
    features: [
      {
        text: 'Requires manual entry and formatting',
        positive: false,
      },
      {
        text: 'Easy to forget achievements',
        positive: false,
      },
      {
        text: 'Time-consuming to maintain',
        positive: false,
      },
      {
        text: 'Inconsistent updates',
        positive: false,
      },
      {
        text: 'Limited context and details',
        positive: false,
      },
    ],
  },
  ai: {
    title: 'Bragdoc.ai Assistant',
    description: 'AI-powered achievement tracking',
    features: [
      {
        text: 'Automatic capture from chat and Git',
        positive: true,
      },
      {
        text: 'Real-time achievement logging',
        positive: true,
      },
      {
        text: 'Smart categorization and organization',
        positive: true,
      },
      {
        text: 'Automated review document generation',
        positive: true,
      },
      {
        text: 'Rich context preservation',
        positive: true,
      },
    ],
  },
};

export function BragDocComparison() {
  return (
    <section
      id="comparison"
      aria-label="Compare manual vs AI-assisted brag documents"
      className="py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            The Smart Way to Track Achievements
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            See how our AI assistant transforms the way you document your
            professional growth.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-y-10 gap-x-8 sm:grid-cols-2">
          {[comparison.manual, comparison.ai].map((option) => (
            <div
              key={option.title}
              className="relative rounded-2xl border border-slate-200 dark:border-slate-800 p-8"
            >
              <h3 className="text-lg font-semibold leading-8 text-slate-900 dark:text-slate-100">
                {option.title}
              </h3>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                {option.description}
              </p>
              <ul className="mt-8 space-y-4">
                {option.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex gap-x-3">
                    {feature.positive ? (
                      <CheckIcon
                        className="h-6 w-5 flex-none text-blue-600"
                        aria-hidden="true"
                      />
                    ) : (
                      <CrossCircledIcon
                        className="h-6 w-5 flex-none text-slate-400"
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
