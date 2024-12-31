'use client';

import { Container } from '@/components/marketing/salient/Container';
import { useState } from 'react';
import { motion } from 'framer-motion';

const templates = [
  {
    name: 'Performance Review',
    description:
      'Comprehensive review documents that highlight your impact and growth.',
    preview: `Performance Review Summary - Q4 2023

Key Achievements:
1. Technical Leadership
   • Led Auth0 migration affecting 10,000 users with zero downtime
   • Reduced maintenance overhead by 120 hours annually
   • Improved system security through industry-standard authentication

2. Project Impact
   • Delivered 3 major features ahead of schedule
   • Achieved 99.9% uptime for critical systems
   • Reduced API response time by 40%

3. Team Collaboration
   • Mentored 2 junior developers
   • Led 5 technical design reviews
   • Improved team documentation processes

Growth Areas & Goals:
• Expanding system architecture knowledge
• Taking on more cross-team initiatives
• Developing public speaking skills`,
  },
  {
    name: 'Monthly Summary',
    description:
      'Monthly achievement summaries perfect for regular check-ins and updates.',
    preview: `Monthly Achievement Summary - December 2023

Technical Achievements:
• Completed Auth0 integration project
• Implemented automated testing framework
• Optimized database queries (40% performance improvement)

Leadership & Collaboration:
• Mentored new team member on backend architecture
• Led weekly team technical discussions
• Contributed to engineering blog post

Metrics & Impact:
• Reduced system maintenance time by 10 hours
• Improved test coverage to 90%
• Zero production incidents

Key Learnings:
• Advanced authentication patterns
• Team leadership skills
• Performance optimization techniques`,
  },
  {
    name: 'Resume Achievements',
    description: 'Achievement bullets perfectly formatted for your resume.',
    preview: `Senior Software Engineer Achievement Highlights

• Led migration of authentication system to Auth0, affecting 10,000+ users, achieving zero downtime and reducing maintenance overhead by 120 hours annually

• Architected and implemented automated testing framework, increasing test coverage to 90% and reducing bug reports by 60%

• Mentored 2 junior developers and led 5 technical design reviews, improving team velocity by 30%

• Optimized critical API endpoints, resulting in 40% reduction in response time and improved user experience

• Implemented monitoring and alerting system, achieving 99.9% uptime for critical services

• Drove adoption of modern development practices, reducing deployment time by 50%`,
  },
];

export function HowTemplates() {
  const [activeTemplate, setActiveTemplate] = useState(0);

  return (
    <section
      id="templates"
      aria-label="Document templates"
      className="py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Professional Templates
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            Turn your achievements into polished, professional documents for any
            occasion.
          </p>
        </div>
        <div className="mt-16">
          <div className="flex justify-center space-x-4">
            {templates.map((template, index) => (
              <button
                type="button"
                key={template.name}
                onClick={() => setActiveTemplate(index)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTemplate === index
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {template.name}
              </button>
            ))}
          </div>
          <div className="mt-8">
            <motion.div
              key={activeTemplate}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mx-auto max-w-3xl"
            >
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {templates[activeTemplate].name}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {templates[activeTemplate].description}
                </p>
                <pre className="mt-6 whitespace-pre-wrap rounded-lg bg-slate-50 dark:bg-slate-900 p-4 text-sm text-slate-900 dark:text-slate-100">
                  {templates[activeTemplate].preview}
                </pre>
              </div>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}
