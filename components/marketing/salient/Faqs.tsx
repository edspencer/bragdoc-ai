'use client'

import { Disclosure } from '@headlessui/react'
import clsx from 'clsx'

import { Container } from './Container'

const faqs = [
  {
    question: 'How does bragdoc.ai capture my achievements?',
    answer:
      'bragdoc.ai uses AI to analyze your messages, GitHub activity, and other inputs to automatically identify and document your achievements. You can also manually add achievements through our intuitive interface.',
  },
  {
    question: 'Can I export my achievements for performance reviews?',
    answer:
      'Yes! You can export your achievements in various formats including PDF, Word, and plain text. Our export feature organizes achievements by project, impact, and time period to create professional performance review documents.',
  },
  {
    question: 'How does the GitHub integration work?',
    answer:
      'Our GitHub integration automatically analyzes your commits, pull requests, and code reviews to identify technical achievements. It captures not just the what, but also the impact of your contributions.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Absolutely. We take security seriously and employ industry-standard encryption for all data. Your achievements and personal information are never shared without your explicit permission.',
  },
  {
    question: 'Can I use bragdoc.ai with my team?',
    answer:
      'Yes! Our Pro and Enterprise plans include team collaboration features. Team members can share achievements, provide feedback, and managers can track team accomplishments.',
  },
  {
    question: 'Do you offer a free trial?',
    answer:
      'Yes, we offer a 14-day free trial of our Pro plan. You can also use our Personal plan for free indefinitely with basic features.',
  },
]

export function Faqs() {
  return (
    <section
      id="faqs"
      aria-labelledby="faqs-title"
      className="relative overflow-hidden bg-slate-50 py-20 dark:bg-slate-900/50 sm:py-32"
    >
      <Container className="relative">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2
            id="faqs-title"
            className="font-display text-3xl tracking-tight text-slate-900 dark:text-white sm:text-4xl"
          >
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            If you can&apos;t find what you&apos;re looking for, email our support team and if you&apos;re lucky someone will get back to you.
          </p>
        </div>
        <ul
          className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3"
        >
          {faqs.map((faq) => (
            <li key={faq.question}>
              <Disclosure as="div" className="rounded-lg bg-white dark:bg-slate-800/60 p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-150">
                {({ open }) => (
                  <>
                    <Disclosure.Button className="flex w-full items-start justify-between text-left">
                      <span className="text-base font-semibold leading-7 text-slate-900 dark:text-white">
                        {faq.question}
                      </span>
                      <span className="ml-6 flex h-7 items-center">
                        <svg
                          className={clsx(
                            'size-6 text-slate-600 dark:text-slate-400',
                            open ? 'rotate-180' : ''
                          )}
                          aria-hidden="true"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </span>
                    </Disclosure.Button>
                    <Disclosure.Panel className="mt-2 text-base leading-7 text-slate-600 dark:text-slate-300">
                      {faq.answer}
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
