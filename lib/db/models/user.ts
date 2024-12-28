import { User } from '../schema';
import { addMonths, addYears, isAfter } from 'date-fns';

export function isActiveSubscription(user: User): boolean {
  // Free users are never considered "active" subscription
  if (user.level === 'free') {
    return false;
  }

  // If no last payment, subscription isn't active
  if (!user.lastPayment) {
    return false;
  }

  const now = new Date();
  const lastPayment = new Date(user.lastPayment);

  // Check if within subscription period based on renewal period
  if (user.renewalPeriod === 'monthly') {
    const nextPaymentDue = addMonths(lastPayment, 1);
    return isAfter(nextPaymentDue, now);
  } else {
    const nextPaymentDue = addYears(lastPayment, 1);
    return isAfter(nextPaymentDue, now);
  }
}

export function getCurrentPlan(user: User): string {
  if (!isActiveSubscription(user)) {
    return 'free';
  }
  return user.level;
}

// You can add more user-related business logic functions here
export function canAccessGitHubFeatures(user: User): boolean {
  return isActiveSubscription(user);
}

export function canCreateUnlimitedDocuments(user: User): boolean {
  return isActiveSubscription(user);
}

export function getMaxAllowedRepositories(user: User): number {
  if (!isActiveSubscription(user)) {
    return 0;
  }
  return user.level === 'pro' ? Infinity : 1;
}
