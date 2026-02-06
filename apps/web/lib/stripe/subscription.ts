import type { User } from '@bragdoc/database/schema';

export interface SubscriptionStatus {
  /** Whether user has active paid access (paid or demo level) */
  isActive: boolean;
  /** Type of subscription */
  type: 'free' | 'yearly' | 'lifetime' | 'demo';
  /** When yearly subscription expires (undefined for lifetime/demo/free) */
  expiresAt?: Date;
  /** Days until expiry for yearly subscriptions */
  daysRemaining?: number;
}

/**
 * Calculate subscription status for a user.
 * Used for feature gating and UI display.
 *
 * Rules:
 * - Demo users always have unlimited access
 * - Paid users with 'lifetime' renewalPeriod never expire
 * - Paid users with 'yearly' renewalPeriod expire 1 year after lastPayment
 * - Free users have credit-limited access
 * - Legacy basic/pro values are treated as free (migration not needed)
 */
export function getSubscriptionStatus(user: User): SubscriptionStatus {
  // Demo users always have unlimited access
  if (user.level === 'demo') {
    return { isActive: true, type: 'demo' };
  }

  // Free users (and legacy basic/pro) have credit-limited access
  if (user.level === 'free' || user.level === 'basic' || user.level === 'pro') {
    return { isActive: false, type: 'free' };
  }

  // Paid users: check renewal period
  if (user.level === 'paid') {
    // Lifetime never expires
    if (user.renewalPeriod === 'lifetime') {
      return { isActive: true, type: 'lifetime' };
    }

    // Yearly: check if within renewal window
    if (user.renewalPeriod === 'yearly' && user.lastPayment) {
      const lastPayment = new Date(user.lastPayment);
      const expiresAt = new Date(lastPayment);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const now = new Date();
      const isActive = expiresAt > now;

      // Calculate days remaining
      const msRemaining = expiresAt.getTime() - now.getTime();
      const daysRemaining = Math.max(
        0,
        Math.ceil(msRemaining / (1000 * 60 * 60 * 24)),
      );

      return { isActive, type: 'yearly', expiresAt, daysRemaining };
    }

    // Paid but no lastPayment or renewalPeriod - treat as expired yearly
    // This shouldn't happen in normal flow but handles edge cases
    return { isActive: false, type: 'yearly' };
  }

  // Default fallback (shouldn't reach here with valid enum)
  return { isActive: false, type: 'free' };
}

/**
 * Check if user has active unlimited access (not credit-limited).
 * Convenience function for feature gates.
 */
export function hasUnlimitedAccess(user: User): boolean {
  const status = getSubscriptionStatus(user);
  return status.isActive;
}
