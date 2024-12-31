'use client';

import { Container } from '@/components/marketing/salient/Container';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { motion } from 'framer-motion';

const examples = [
  {
    category: 'Project Impact',
    entries: [
      {
        title: 'Search Performance Optimization',
        date: 'Q3 2023',
        content:
          'Led the optimization of our search infrastructure, resulting in a 40% reduction in query response time and a 25% increase in user engagement. Implemented elasticsearch caching and query optimization techniques.',
      },
      {
        title: 'Customer Onboarding Redesign',
        date: 'Q2 2023',
        content:
          'Spearheaded the redesign of our customer onboarding flow, reducing drop-off rate by 35% and increasing conversion by 20%. Gathered and incorporated feedback from 50+ customers.',
      },
    ],
  },
  {
    category: 'Team Leadership',
    entries: [
      {
        title: 'New Developer Mentorship',
        date: 'Ongoing',
        content:
          'Mentored 3 junior developers, creating personalized learning plans and conducting weekly 1:1s. All mentees successfully completed their probation and received positive performance reviews.',
      },
      {
        title: 'Architecture Decision Records',
        date: 'Q1 2023',
        content:
          'Introduced and standardized Architecture Decision Records (ADRs) across the engineering org, improving documentation and knowledge sharing. Created template and conducted 3 training sessions.',
      },
    ],
  },
  {
    category: 'Skills Development',
    entries: [
      {
        title: 'Public Speaking',
        date: 'Q4 2023',
        content:
          'Delivered 2 technical talks at internal engineering all-hands (200+ attendees) on our migration to microservices. Received average feedback score of 4.8/5.',
      },
      {
        title: 'Technical Writing',
        date: 'Q3 2023',
        content:
          'Published 4 technical blog posts on our engineering blog, covering our journey with TypeScript and Next.js. Posts received 10k+ views and were shared widely on social media.',
      },
    ],
  },
];

export function BragDocExamples() {
  const [activeCategory, setActiveCategory] = useState(examples[0].category);

  return (
    <section
      id="examples"
      aria-label="Brag document examples"
      className="bg-slate-50 dark:bg-slate-900 py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Real Brag Document Examples
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            See how professionals document their achievements effectively. Use
            these as templates for your own brag document.
          </p>
        </div>
        <div className="mt-16">
          <div className="flex justify-center space-x-4">
            {examples.map((category) => (
              <Button
                key={category.category}
                variant={
                  activeCategory === category.category ? 'default' : 'ghost'
                }
                onClick={() => setActiveCategory(category.category)}
              >
                {category.category}
              </Button>
            ))}
          </div>
          <div className="mt-8">
            {examples.map(
              (category) =>
                activeCategory === category.category && (
                  <motion.div
                    key={category.category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid gap-8 md:grid-cols-2"
                  >
                    {category.entries.map((entry) => (
                      <div
                        key={entry.title}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            {entry.title}
                          </h3>
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {entry.date}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">
                          {entry.content}
                        </p>
                      </div>
                    ))}
                  </motion.div>
                )
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
