import { Container } from '@/components/marketing/salient/Container';

const capabilities = [
  {
    title: 'Natural Language Understanding',
    description:
      'Our AI understands context and nuance in your conversations, automatically identifying achievements and their impact.',
    details: [
      'Extracts achievements from casual conversation',
      'Identifies quantifiable metrics and impact',
      'Understands technical and business context',
    ],
  },
  {
    title: 'Smart Achievement Enhancement',
    description:
      'The AI helps you enhance your achievements by suggesting relevant metrics, context, and professional framing.',
    details: [
      'Suggests relevant metrics to track',
      'Adds business context to technical work',
      'Improves achievement descriptions for impact',
    ],
  },
  {
    title: 'Intelligent Organization',
    description:
      'Your achievements are automatically categorized and organized to tell a compelling career story.',
    details: [
      'Categorizes achievements by skill and impact',
      'Identifies growth patterns and trends',
      'Suggests areas for skill development',
    ],
  },
  {
    title: 'Document Generation',
    description:
      'Generate polished, professional documents tailored to your specific needs and audience.',
    details: [
      'Performance review documents',
      'Resume achievement bullets',
      'Professional bio updates',
    ],
  },
];

export function HowAI() {
  return (
    <section
      id="ai"
      aria-label="AI capabilities"
      className="bg-slate-50 dark:bg-slate-900 py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Powered by Advanced AI
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            Our AI assistant makes it effortless to capture, enhance, and
            leverage your achievements for career growth.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {capabilities.map((capability) => (
              <div
                key={capability.title}
                className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-8"
              >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {capability.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {capability.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {capability.details.map((detail, index) => (
                    <li
                      key={index}
                      className="flex items-center text-sm text-slate-600 dark:text-slate-400"
                    >
                      <span className="mr-2 text-blue-600">•</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
