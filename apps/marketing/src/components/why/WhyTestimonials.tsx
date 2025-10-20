import { Container } from '@/components/salient/Container';
import Image from 'next/image';

const testimonials = [
  {
    content:
      "Before I started keeping a brag document, I was constantly underselling myself in reviews. Now, I walk into every meeting confident and prepared. It's completely changed how I approach career conversations.",
    author: {
      name: 'David Park',
      role: 'Senior Product Manager',
      company: 'Fortune 500 Tech Company',
      image: '/images/avatars/avatar-4.png',
    },
  },
  {
    content:
      "As a manager, I now require all my reports to maintain brag documents. It's made our review process more objective and helps ensure everyone's contributions are recognized. The impact on team morale has been incredible.",
    author: {
      name: 'Lisa Chen',
      role: 'Engineering Director',
      company: 'Leading Startup',
      image: '/images/avatars/avatar-5.png',
    },
  },
  {
    content:
      "I used to think keeping track of achievements was boastful. Now I realize it's about taking ownership of your career narrative. My brag document helped me land a role that doubled my salary.",
    author: {
      name: 'Marcus Johnson',
      role: 'Marketing Lead',
      company: 'Global Agency',
      image: '/images/avatars/avatar-6.png',
    },
  },
];

export function WhyTestimonials() {
  return (
    <section
      id="testimonials"
      aria-label="What people are saying"
      className="bg-slate-50 dark:bg-slate-900 py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Trusted by Industry Leaders
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            Hear from professionals who&apos;ve transformed their careers with
            brag documents.
          </p>
        </div>
        <ul className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:gap-8 lg:mt-20 lg:max-w-none lg:grid-cols-3">
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
                      className="size-14 object-cover"
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
