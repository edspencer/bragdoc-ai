import { Container } from '@/components/marketing/salient/Container';
import Image from 'next/image';

const testimonials = [
  {
    content:
      "Keeping a brag document completely changed how I approach performance reviews. Instead of scrambling to remember what I did, I now have a clear record of my impact. It's helped me secure two promotions in the past year.",
    author: {
      name: 'Sarah Chen',
      role: 'Senior Engineering Manager',
      image: '/images/avatars/avatar-1.png',
    },
  },
  {
    content:
      "As someone who used to struggle with self-promotion, having a brag document has been game-changing. It's not about bragging - it's about accurately representing your value to the organization.",
    author: {
      name: 'Michael Rodriguez',
      role: 'Product Manager',
      image: '/images/avatars/avatar-2.png',
    },
  },
  {
    content:
      "I recommend brag documents to every member of my team. It's not just about reviews - it helps us celebrate wins, identify growth opportunities, and ensure everyone's contributions are recognized.",
    author: {
      name: 'Emily Thompson',
      role: 'Director of Engineering',
      image: '/images/avatars/avatar-3.png',
    },
  },
];

export function BragDocTestimonials() {
  return (
    <section
      id="testimonials"
      aria-label="What others say about brag documents"
      className="py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Loved by Career-Focused Professionals
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            See how others have transformed their career growth with brag
            documents.
          </p>
        </div>
        <ul
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
