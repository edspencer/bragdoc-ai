import type { User } from '@/lib/db/schema';
import { 
  isActiveSubscription, 
  getCurrentPlan
} from '@/lib/db/models/user';
import { subDays, } from 'date-fns';

describe('User Model', () => {
  const baseUser: User = {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    provider: 'credentials',
    level: 'free',
    renewalPeriod: 'monthly',
    status: 'active',
    preferences: {
      hasSeenWelcome: false,
      language: 'en'
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: new Date(),
    lastPayment: null,
    providerId: null,
    githubAccessToken: null,
    image: null,
    password: null
  };

  describe('isActiveSubscription', () => {
    it('returns false for free users', () => {
      const user = { ...baseUser, level: 'free' } as User;
      expect(isActiveSubscription(user)).toBe(false);
    });

    it('returns false if no last payment', () => {
      const user = { ...baseUser, level: 'basic' } as User;

      expect(isActiveSubscription(user)).toBe(false);
    });

    it('returns true for monthly subscription with recent payment', () => {
      const user = {
        ...baseUser,
        level: 'basic',
        renewalPeriod: 'monthly',
        lastPayment: new Date(),
      } as User;
      expect(isActiveSubscription(user)).toBe(true);
    });

    it('returns false for monthly subscription with old payment', () => {
      const user = {
        ...baseUser,
        level: 'basic',
        renewalPeriod: 'monthly',
        lastPayment: subDays(new Date(), 32), // Over a month ago
      } as User;
      expect(isActiveSubscription(user)).toBe(false);
    });

    it('returns true for yearly subscription within the year', () => {
      const user = {
        ...baseUser,
        level: 'pro',
        renewalPeriod: 'yearly',
        lastPayment: subDays(new Date(), 364), // Just under a year ago
      } as User;
      expect(isActiveSubscription(user)).toBe(true);
    });
  });

  describe('getCurrentPlan', () => {
    it('returns free for inactive subscriptions', () => {
      const user = { ...baseUser, level: 'basic' } as User; // No lastPayment, so inactive
      expect(getCurrentPlan(user)).toBe('free');
    });

    it('returns current level for active subscriptions', () => {
      const user = {
        ...baseUser,
        level: 'pro',
        lastPayment: new Date(),
      } as User;
      expect(getCurrentPlan(user)).toBe('pro');
    });
  });
});
