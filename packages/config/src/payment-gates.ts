export type UserLevel = 'free' | 'basic' | 'pro';

export type FeatureGate =
  | 'unlimited_documents'
  | 'ai_assistant'
  | 'advanced_analytics'
  | 'team_collaboration'
  | 'api_access';

export const featureGates: Record<FeatureGate, UserLevel[]> = {
  unlimited_documents: ['basic', 'pro'],
  ai_assistant: ['pro'],
  advanced_analytics: ['pro'],
  team_collaboration: ['pro'],
  api_access: ['pro'],
};

export const isPaymentRequired = (): boolean => {
  return process.env.PAYMENT_TOKEN_REQUIRED === 'true';
};

export const requiresPayment = (
  userLevel: UserLevel,
  feature: FeatureGate,
): boolean => {
  if (!isPaymentRequired()) return false;
  return !featureGates[feature]?.includes(userLevel);
};
