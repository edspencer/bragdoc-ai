import { Container } from '@/components/marketing/salient/Container';
import Image from 'next/image';

const testimonials = [
  {
    content:
      "I was skeptical about using AI for tracking achievements, but bragdoc.ai's natural conversation approach makes it feel effortless. I'm capturing so many more wins that I used to overlook.",
    author: {
      name: 'Alex Rivera',
      role: 'Full Stack Developer',
      company: 'Tech Startup',
      image: '/images/avatars/avatar-7.png',
    },
  },
  {
    content:
      "The GitHub integration is brilliant. It automatically captures my technical contributions and frames them in a way that resonates with non-technical stakeholders. It's like having a career coach in my pocket.",
    author: {
      name: 'Sarah Kim',
      role: 'Senior Software Engineer',
      company: 'Enterprise Tech',
      image: '/images/avatars/avatar-8.png',
    },
  },
  {
    content:
      "The performance review documents this generates are incredible. Instead of spending hours preparing for reviews, I now have a comprehensive record of my impact ready to go. It's transformed how I approach career development.",
    author: {
      name: 'Michael Chen',
      role: 'Engineering Manager',
      company: 'Growth Company',
      image: '/images/avatars/avatar-9.png',
    },
  },
];

export function HowTestimonials() {
  return (
    <section
      id="testimonials"
      aria-label="What people are saying"
      className="bg-slate-50 dark:bg-slate-900 py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Loved by Professionals
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            See how others are using bragdoc.ai to advance their careers.
          </p>
        </div>
        <ul
          role="list"
          className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:gap-8 lg:mt-20 lg:max-w-none lg:grid-cols-3"
        >
          {testimonials.map((testimonial, testimonialIndex) => (
            <li key={testimonialIndex}>
              <figure className="relative rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl shadow-slate-900/10">
                <blockquote className="relative">
                  <p className="text-lg tracking-tight text-slate-900 dark:text-slate-100">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                </blockquote>
                <figcaption className="relative mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-6">
                  <div>
                    <div className="font-display text-base text-slate-900 dark:text-slate-100">
                      {testimonial.author.name}
                    </div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {testimonial.author.role}
                    </div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {testimonial.author.company}
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-full bg-slate-50">
                    <Image
                      className="h-14 w-14 object-cover"
                      src={testimonial.author.image}
                      alt=""
                      width={56}
                      height={56}
                    />
                  </div>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
