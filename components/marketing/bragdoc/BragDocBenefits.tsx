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
    name: 'Performance Reviews',
    description:
      'Present specific examples and quantifiable results during reviews. Never struggle to remember your achievements again.',
    icon: BarChartIcon,
  },
  {
    name: 'Career Advancement',
    description:
      'Build a compelling portfolio of accomplishments that showcases your readiness for the next level.',
    icon: RocketIcon,
  },
  {
    name: 'Salary Negotiations',
    description:
      'Back your value with concrete examples of contributions and positive impact on the organization.',
    icon: LightningBoltIcon,
  },
  {
    name: 'Self-Reflection',
    description:
      'Track your professional growth and identify patterns in your successes and areas for improvement.',
    icon: PersonIcon,
  },
  {
    name: 'Team Recognition',
    description:
      'Ensure your contributions are visible to leadership and help your manager advocate for you.',
    icon: ChatBubbleIcon,
  },
  {
    name: 'Resume Building',
    description:
      'Keep an up-to-date record of achievements that makes updating your resume or LinkedIn profile effortless.',
    icon: ReaderIcon,
  },
];

export function BragDocBenefits() {
  return (
    <section
      id="benefits"
      aria-label="Benefits of keeping a brag document"
      className="pb-14 pt-20 sm:pb-20 sm:pt-32 lg:pb-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Why Keep a Brag Document?
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            A brag document is your secret weapon for career growth. Here&apos;s
            how it helps you succeed.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-7xl">
          <div className="grid grid-cols-1 gap-y-10 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit.name} className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-slate-900 dark:text-slate-100">
                  <div className="absolute left-0 top-0 flex size-10 items-center justify-center rounded-lg bg-blue-600">
                    <benefit.icon
                      className="size-6 text-white"
                      aria-hidden="true"
                    />
                  </div>
                  {benefit.name}
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
