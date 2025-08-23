import { Container } from '@/components/salient/Container';
import {
  ChatBubbleIcon,
  GitHubLogoIcon,
  RocketIcon,
  MixerVerticalIcon,
  LayersIcon,
  ReaderIcon,
} from '@radix-ui/react-icons';

const features = [
  {
    name: 'Natural Conversation',
    description:
      'Chat with our AI assistant about your work day. It automatically identifies and records achievements from your conversations.',
    icon: ChatBubbleIcon,
  },
  {
    name: 'GitHub Integration',
    description:
      'Automatically extract achievements from your pull requests, commit messages, and code reviews. Never miss a technical contribution.',
    icon: GitHubLogoIcon,
  },
  {
    name: 'Smart Categories',
    description:
      'Your achievements are automatically organized into categories like Technical Skills, Leadership, Project Impact, and more.',
    icon: LayersIcon,
  },
  {
    name: 'Impact Metrics',
    description:
      'Our AI helps quantify your impact by suggesting relevant metrics and measurements for each achievement.',
    icon: MixerVerticalIcon,
  },
  {
    name: 'Review Documents',
    description:
      'Generate polished performance review documents, resumes, and career narratives with one click.',
    icon: ReaderIcon,
  },
  {
    name: 'Growth Insights',
    description:
      'Get AI-powered insights about your career trajectory and suggestions for areas of growth and opportunity.',
    icon: RocketIcon,
  },
];

export function HowFeatures() {
  return (
    <section
      id="features"
      aria-label="Features for documenting achievements"
      className="py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Everything You Need to Succeed
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            bragdoc.ai combines AI-powered conversation, automatic achievement
            tracking, and smart document generation to help you build a
            compelling career narrative.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-7xl">
          <div className="grid grid-cols-1 gap-y-10 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-slate-900 dark:text-slate-100">
                  <div className="absolute left-0 top-0 flex size-10 items-center justify-center rounded-lg bg-blue-600">
                    <feature.icon
                      className="size-6 text-white"
                      aria-hidden="true"
                    />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base leading-7 text-slate-600 dark:text-slate-400">
                  {feature.description}
                </dd>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
