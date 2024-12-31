import { Container } from '@/components/marketing/salient/Container';
import {
  RocketIcon,
  PersonIcon,
  BarChartIcon,
  ChatBubbleIcon,
  LightningBoltIcon,
  ReaderIcon,
} from '@radix-ui/react-icons';

const benefits = [
  {
    title: 'Performance Reviews Made Easy',
    description:
      'Walk into every review with confidence, armed with concrete examples of your impact. No more scrambling to remember what you accomplished.',
    icon: BarChartIcon,
  },
  {
    title: 'Accelerate Your Career Growth',
    description:
      'Identify patterns in your successes and strategically plan your next career moves. Your brag document becomes your personal career roadmap.',
    icon: RocketIcon,
  },
  {
    title: 'Maximize Your Compensation',
    description:
      'Support your case for raises and promotions with documented evidence of your value. Data shows that professionals who track achievements earn more.',
    icon: LightningBoltIcon,
  },
  {
    title: 'Build Self-Confidence',
    description:
      'Regular reflection on your achievements builds confidence and helps you recognize your true value. Combat imposter syndrome with evidence.',
    icon: PersonIcon,
  },
  {
    title: 'Strengthen Your Personal Brand',
    description:
      'Transform your LinkedIn profile and resume with powerful, specific examples. Stand out in job interviews with compelling stories.',
    icon: ChatBubbleIcon,
  },
  {
    title: 'Create Your Legacy',
    description:
      'Build a comprehensive record of your professional journey. Your brag document becomes a valuable asset throughout your entire career.',
    icon: ReaderIcon,
  },
];

export function WhyBenefits() {
  return (
    <section
      id="benefits"
      aria-label="Benefits of keeping a brag document"
      className="py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Transform Your Career Trajectory
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            A brag document is more than just a list of achievements - it&apos;s a
            powerful tool for career advancement and personal growth.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-7xl">
          <div className="grid grid-cols-1 gap-y-10 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-slate-900 dark:text-slate-100">
                  <div className="absolute left-0 top-0 flex size-10 items-center justify-center rounded-lg bg-blue-600">
                    <benefit.icon className="size-6 text-white" aria-hidden="true" />
                  </div>
                  {benefit.title}
                </dt>
                <dd className="mt-2 text-base leading-7 text-slate-600 dark:text-slate-400">
                  {benefit.description}
                </dd>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
