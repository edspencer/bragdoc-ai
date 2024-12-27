'use client';

import { useState } from 'react';
import { Radio, RadioGroup } from '@headlessui/react';
import { CheckCircledIcon } from '@radix-ui/react-icons';
import { plans } from '@/lib/plans';

type FrequencyOption = 'Monthly' | 'Yearly';

type PriceDetails = {
  amount: string;
  stripe_price_id: string;
};

type Plan = {
  name: string;
  featured: boolean;
  price: Record<FrequencyOption, PriceDetails>;
  description: string;
  button: {
    label: string;
    href: string;
  };
  features: string[];
};

const frequencies: { value: FrequencyOption; label: string }[] = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Yearly', label: 'Yearly' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function Plan() {
  const [frequency, setFrequency] = useState<FrequencyOption>('Monthly');

  return (
    <div className="">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="mx-auto mt-6 max-w-2xl text-pretty font-medium text-gray-600">
          Choose an affordable plan that&apos;s packed with the best features
          for engaging your audience, creating customer loyalty, and driving
          sales.
        </p>
        <div className="mt-16 flex justify-center">
          <fieldset aria-label="Payment frequency">
            <RadioGroup
              value={frequency}
              onChange={setFrequency}
              className="grid grid-cols-2 gap-x-1 rounded-full p-1 text-center text-xs/5 font-semibold ring-1 ring-inset ring-gray-200"
            >
              {frequencies.map((option) => (
                <Radio
                  key={option.value}
                  value={option.value}
                  className="cursor-pointer rounded-full px-2.5 py-1 text-gray-500 data-[checked]:bg-indigo-600 data-[checked]:text-white"
                >
                  {option.label}
                </Radio>
              ))}
            </RadioGroup>
          </fieldset>
        </div>
        <div className="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 md:max-w-2xl md:grid-cols-2 lg:max-w-4xl xl:mx-0 xl:max-w-none xl:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={classNames(
                plan.featured
                  ? 'ring-2 ring-indigo-600'
                  : 'ring-1 ring-gray-200',
                'rounded-3xl p-6'
              )}
            >
              <h3
                id={plan.name}
                className={classNames(
                  plan.featured ? 'text-indigo-600' : 'text-gray-900',
                  'text-lg/8 font-semibold'
                )}
              >
                {plan.name}
              </h3>
              <p className="mt-4 text-sm/6 text-gray-600">{plan.description}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-semibold tracking-tight text-gray-900">
                  {plan.price[frequency].amount}
                </span>
              </p>
              <a
                href={plan.button.href}
                aria-describedby={plan.name}
                className={classNames(
                  plan.featured
                    ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500'
                    : 'text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300',
                  'mt-6 block rounded-md px-3 py-2 text-center text-sm/6 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                )}
              >
                {plan.button.label}
              </a>
              <ul
                role="list"
                className="mt-8 space-y-3 text-sm/6 text-gray-600"
              >
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <CheckCircledIcon
                      aria-hidden="true"
                      className="h-6 w-5 flex-none text-indigo-600"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
