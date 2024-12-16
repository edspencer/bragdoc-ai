'use client'

import { useState } from 'react'
import { RadioGroup } from '@headlessui/react'
import clsx from 'clsx'

import { Button } from './Button'
import { Container } from './Container'

const plans = [
  {
    name: 'Personal',
    featured: false,
    price: { Monthly: '$0', Yearly: '$0' },
    description:
      'Perfect for individual contributors looking to track their achievements.',
    button: {
      label: 'Get started for free',
      href: '/register',
    },
    features: [
      'Unlimited achievement tracking',
      'Weekly summaries',
      'Basic GitHub integration',
      'Export to PDF',
      'Dark mode',
    ],
  },
  {
    name: 'Pro',
    featured: true,
    price: { Monthly: '$15', Yearly: '$144' },
    description:
      'For professionals who want advanced features and integrations.',
    button: {
      label: 'Start free trial',
      href: '/register?plan=pro',
    },
    features: [
      'Everything in Personal',
      'Advanced GitHub analytics',
      'Custom achievement categories',
      'Priority support',
      'Team collaboration',
      'API access',
    ],
  },
  {
    name: 'Enterprise',
    featured: false,
    price: { Monthly: 'Custom', Yearly: 'Custom' },
    description:
      'For organizations that need advanced security and control.',
    button: {
      label: 'Contact sales',
      href: '/contact',
    },
    features: [
      'Everything in Pro',
      'SSO authentication',
      'Custom integrations',
      'Advanced analytics',
      'Dedicated support',
      'Custom training',
    ],
  },
]

function CheckIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M9.307 12.248a.75.75 0 1 0-1.114 1.004l1.114-1.004ZM11 15.25l-.557.502a.75.75 0 0 0 1.15-.043L11 15.25Zm4.844-5.041a.75.75 0 0 0-1.188-.918l1.188.918Zm-7.651 3.043 2.25 2.5 1.114-1.004-2.25-2.5-1.114 1.004Zm3.4 2.457 4.25-5.5-1.187-.918-4.25 5.5 1.188.918Z"
        fill="currentColor"
      />
      <circle
        cx="12"
        cy="12"
        r="8.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Plan({
  name,
  price,
  description,
  button,
  features,
  featured = false,
  activePeriod,
}: any) {
  return (
    <section
      className={clsx(
        'flex flex-col rounded-3xl px-6 sm:px-8',
        featured ? 'order-first bg-blue-600 py-8 lg:order-none' : 'lg:py-8'
      )}
    >
      <h3 className="mt-5 font-display text-lg text-white">{name}</h3>
      <p
        className={clsx(
          'mt-2 text-base',
          featured ? 'text-white' : 'text-slate-400'
        )}
      >
        {description}
      </p>
      <p className="order-first font-display text-5xl font-light tracking-tight text-white">
        {price[activePeriod]}
      </p>
      <ul
        role="list"
        className={clsx(
          'order-last mt-10 flex flex-col gap-y-3 text-sm',
          featured ? 'text-white' : 'text-slate-200'
        )}
      >
        {features.map((feature: string) => (
          <li key={feature} className="flex">
            <CheckIcon className={clsx('h-6 w-6 flex-none', featured ? 'text-white' : 'text-slate-400')} />
            <span className="ml-4">{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        href={button.href}
        variant={featured ? 'solid' : 'outline'}
        color="white"
        className="mt-8"
        aria-label={`Get started with the ${name} plan for ${price[activePeriod]}`}
      >
        {button.label}
      </Button>
    </section>
  )
}

export function Pricing() {
  let [activePeriod, setActivePeriod] = useState<'Monthly' | 'Yearly'>('Monthly')

  return (
    <section
      id="pricing"
      aria-label="Pricing"
      className="bg-slate-900 py-20 sm:py-32"
    >
      <Container>
        <div className="md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-white sm:text-4xl">
            <span className="relative whitespace-nowrap">
              <span className="relative">Simple pricing,</span>
            </span>{' '}
            for everyone.
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Whether you&apos;re just starting out or scaling up, we&apos;ve got you covered.
          </p>
        </div>
        <div className="mt-8 flex justify-center">
          <div className="relative">
            <RadioGroup
              value={activePeriod}
              onChange={setActivePeriod}
              className="grid grid-cols-2 gap-x-1 rounded-full bg-slate-800/80 p-1"
            >
              <RadioGroup.Label className="sr-only">Payment frequency</RadioGroup.Label>
              {['Monthly', 'Yearly'].map((period) => (
                <RadioGroup.Option
                  key={period}
                  value={period}
                  className={({ checked }) =>
                    clsx(
                      'cursor-pointer rounded-full px-4 py-2 text-sm font-semibold',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                      checked
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700'
                    )
                  }
                >
                  {period}
                </RadioGroup.Option>
              ))}
            </RadioGroup>
          </div>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
          {plans.map((plan) => (
            <Plan key={plan.name} {...plan} activePeriod={activePeriod} />
          ))}
        </div>
      </Container>
    </section>
  )
}
