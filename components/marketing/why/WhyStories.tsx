import { Container } from '@/components/marketing/salient/Container';
import Image from 'next/image';

const stories = [
  {
    name: 'Sarah Chen',
    role: 'Senior Engineering Manager',
    company: 'Tech Giant Corp',
    image: '/images/avatars/avatar-1.png',
    story:
      'I started keeping a brag document when I was a junior engineer. Three years and two promotions later, I can directly trace my career growth to this practice. During my last promotion discussion, I had concrete examples of my impact that made the decision a no-brainer for leadership.',
    achievement: 'Promoted to Senior Engineering Manager in 3 years',
  },
  {
    name: 'James Wilson',
    role: 'Product Marketing Lead',
    company: 'StartupCo',
    image: '/images/avatars/avatar-2.png',
    story:
      'As someone who struggled with imposter syndrome, my brag document became my confidence anchor. Being able to look back at my achievements helped me recognize my true value. It completely changed how I approach salary negotiations.',
    achievement: '40% salary increase in last negotiation',
  },
  {
    name: 'Maria Rodriguez',
    role: 'Design Director',
    company: 'Creative Agency',
    image: '/images/avatars/avatar-3.png',
    story:
      'My brag document helped me land my dream job. During interviews, I could provide specific examples of my impact and leadership. Instead of generic answers, I had powerful stories that showcased my abilities.',
    achievement: 'Landed director role at top agency',
  },
];

export function WhyStories() {
  return (
    <section
      id="stories"
      aria-label="Success stories"
      className="bg-slate-50 dark:bg-slate-900 py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Real Success Stories
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            See how professionals have transformed their careers by consistently
            tracking their achievements.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-3">
          {stories.map((story) => (
            <div
              key={story.name}
              className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6"
            >
              <div className="flex items-center gap-x-4 border-b border-slate-900/5 dark:border-slate-700 pb-6">
                <Image
                  src={story.image}
                  alt={story.name}
                  className="h-14 w-14 rounded-full object-cover"
                  width={56}
                  height={56}
                />
                <div>
                  <h3 className="text-sm font-semibold leading-7 tracking-tight text-slate-900 dark:text-slate-100">
                    {story.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {story.role} at {story.company}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex-1">
                <p className="text-base text-slate-700 dark:text-slate-300">
                  &ldquo;{story.story}&rdquo;
                </p>
              </div>
              <div className="mt-6 border-t border-slate-900/5 dark:border-slate-700 pt-6">
                <p className="text-sm font-semibold text-blue-600">
                  {story.achievement}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
