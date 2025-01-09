export type PlanId =
  | 'free'
  | 'basic_monthly'
  | 'basic_yearly'
  | 'pro_monthly'
  | 'pro_yearly';

export type FrequencyOption = 'Monthly' | 'Yearly';

export type Plan = {
  name: string;
  shortName: string;
  featured: boolean;
  price: Record<FrequencyOption, PriceDetails>;
  description: string;
  button: {
    label: string;
    href: string;
  };
  features: string[];
};

type PriceDetails = {
  amount: string;
  stripe_price_id: PlanId;
};

export const stripeLinks = {
  pro_yearly: process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID!,
  pro_monthly: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID!,
  basic_yearly: process.env.NEXT_PUBLIC_BASIC_YEARLY_PRICE_ID!,
  basic_monthly: process.env.NEXT_PUBLIC_BASIC_MONTHLY_PRICE_ID!,
};

export const stripeDetails = {
  free_monthly: { amount: '$0', stripe_price_id: 'free_monthly' },
  free_yearly: { amount: '$0', stripe_price_id: 'free_yearly' },
  basic_monthly: { amount: '$5', stripe_price_id: 'basic_monthly' },
  basic_yearly: { amount: '$30', stripe_price_id: 'basic_yearly' },
  pro_monthly: { amount: '$9', stripe_price_id: 'pro_monthly' },
  pro_yearly: { amount: '$90', stripe_price_id: 'pro_yearly' },
};

export const plans: Plan[] = [
  {
    name: 'Free',
    shortName: 'Free',
    featured: false,
    price: {
      Monthly: { amount: '$0', stripe_price_id: 'free' },
      Yearly: { amount: '$0', stripe_price_id: 'free' },
    },
    description: 'Perfect for trying out bragdoc.ai with basic features.',
    button: {
      label: 'Get started for free',
      href: '/register',
    },
    features: [
      'Basic usage limits',
      'Achievement tracking',
      'Document generation',
      'Company tracking',
      'Project tracking',
    ],
  },
  {
    name: 'Basic Achiever',
    shortName: 'Basic',
    featured: true,
    price: {
      Monthly: { amount: '$5/month', stripe_price_id: 'basic_monthly' },
      Yearly: { amount: '$30/year', stripe_price_id: 'basic_yearly' },
    },
    description:
      'For professionals who want unlimited features and GitHub integration.',
    button: {
      label: 'Start Basic plan',
      href: '/register?plan=basic',
    },
    features: [
      'Everything in Free',
      'Unlimited usage',
      'Single GitHub repository integration',
      'Unlimited Achievements & Documents',
      'Document publishing',
    ],
  },
  {
    name: 'Pro Achiever',
    shortName: 'Pro',
    featured: false,
    price: {
      Monthly: { amount: '$9/month', stripe_price_id: 'pro_monthly' },
      Yearly: { amount: '$90/year', stripe_price_id: 'pro_yearly' },
    },
    description: 'For power users who need advanced features and integrations.',
    button: {
      label: 'Start Pro plan',
      href: '/register?plan=pro',
    },
    features: [
      'Everything in Basic',
      'Unlimited GitHub repositories',
      'Scheduled updates',
      'Advanced publishing options',
      'Priority support',
    ],
  },
];
