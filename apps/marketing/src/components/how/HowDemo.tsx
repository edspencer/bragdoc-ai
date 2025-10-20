'use client';

import { Container } from '@/components/salient/Container';
import { useState } from 'react';
import { motion } from 'framer-motion';

const demoSteps = [
  {
    title: 'Chat About Your Day',
    description:
      'Simply tell our AI assistant about your work day in natural language. No forms, no structure required.',
    chat: [
      {
        user: true,
        message:
          'Hey! Today I finished the user authentication system refactor. We moved from a custom solution to Auth0, which should improve security and reduce maintenance overhead. The team was really happy with how smooth the migration went.',
      },
      {
        user: false,
        message:
          "That's great! I've identified an achievement from your message:\n\n🏆 Led successful migration from custom auth to Auth0\n- Improved system security\n- Reduced maintenance overhead\n- Received positive team feedback\n\nWould you like to add any metrics or additional context?",
      },
    ],
  },
  {
    title: 'Review & Enhance',
    description:
      'Our AI helps you enhance your achievements with metrics, context, and proper framing.',
    chat: [
      {
        user: true,
        message:
          "The migration affected about 10,000 users and we had zero downtime during the switch. We're estimating it'll save about 10 hours of maintenance work per month.",
      },
      {
        user: false,
        message:
          "I've updated your achievement with these metrics:\n\n🏆 Led successful migration from custom auth to Auth0\n- Migrated 10,000 users with zero downtime\n- Improved system security through industry-standard authentication\n- Reduced maintenance overhead by ~120 hours annually\n- Received positive team feedback\n\nThis demonstrates both technical leadership and business impact. Great work!",
      },
    ],
  },
  {
    title: 'Generate Documents',
    description:
      'Turn your collected achievements into powerful performance review documents, resumes, and more.',
    chat: [
      {
        user: true,
        message: 'Can you help me prepare for my performance review next week?',
      },
      {
        user: false,
        message:
          "I've prepared a performance review document highlighting your key achievements this quarter:\n\n📊 Technical Leadership\n- Led Auth0 migration (10k users, zero downtime)\n- Architected new microservices infrastructure\n- Mentored 2 junior developers\n\n💡 Innovation & Impact\n- Reduced maintenance by 120 hours/year\n- Improved system security\n- Introduced automated testing (90% coverage)\n\nWould you like me to generate a full document with these points?",
      },
    ],
  },
];

export function HowDemo() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section
      id="demo"
      aria-label="Product demo"
      className="bg-slate-50 dark:bg-slate-900 py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            See How It Works
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            Experience how bragdoc.ai makes it effortless to capture and
            leverage your achievements.
          </p>
        </div>
        <div className="mt-16">
          <div className="flex justify-center space-x-4">
            {demoSteps.map((step, index) => (
              <button
                type="button"
                key={step.title}
                onClick={() => setActiveStep(index)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeStep === index
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {step.title}
              </button>
            ))}
          </div>
          <div className="mt-8">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mx-auto max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-6"
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {demoSteps[activeStep].title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {demoSteps[activeStep].description}
              </p>
              <div className="mt-6 space-y-4">
                {demoSteps[activeStep].chat.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.user ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`rounded-lg p-4 max-w-md ${
                        message.user
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}
