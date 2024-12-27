export const stripeLinks = {
  pro_yearly: 'https://buy.stripe.com/test_5kA5ks7tc0Ox1aM5kn',
  pro_monthly: 'https://buy.stripe.com/test_8wM008dRA1SB4mYaEG',
  basic_yearly: 'https://buy.stripe.com/test_aEUfZ6eVE68R6v69AB',
  basic_monthly: 'https://buy.stripe.com/test_eVaeV2aFogNv3iUbII',
};

export const stripeDetails = {
  free_monthly: { amount: '$0', stripe_price_id: 'free_monthly' },
  free_yearly: { amount: '$0', stripe_price_id: 'free_yearly' },
  basic_monthly: { amount: '$5', stripe_price_id: 'basic_monthly' },
  basic_yearly: { amount: '$30', stripe_price_id: 'basic_yearly' },
  pro_monthly: { amount: '$9', stripe_price_id: 'pro_monthly' },
  pro_yearly: { amount: '$90', stripe_price_id: 'pro_yearly' },
};

export const plans = [
  {
    name: 'Free',
    featured: false,
    price: {
      Monthly: { amount: '$0', stripe_price_id: 'free_monthly' },
      Yearly: { amount: '$0', stripe_price_id: 'free_yearly' },
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
      'Dark mode',
    ],
  },
  {
    name: 'Basic Achiever',
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