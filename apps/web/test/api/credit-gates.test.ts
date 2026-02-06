/**
 * Unit tests for credit gate edge cases (FEATURE-GATE-06)
 *
 * Tests the credit checking utilities used by all LLM-gated endpoints.
 * These are unit tests for the core logic, not integration tests for full endpoints.
 */

import { checkUserCredits, checkUserChatMessages } from '@/lib/credits';
import {
  hasUnlimitedAccess,
  getSubscriptionStatus,
} from '@/lib/stripe/subscription';
import type { User } from '@bragdoc/database';

// Helper to create test users with specific credit/subscription states
function createTestUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    image: null,
    level: 'free',
    renewalPeriod: null,
    lastPayment: null,
    stripeCustomerId: null,
    freeCredits: 10,
    freeChatMessages: 20,
    preferences: null,
    banned: null,
    banReason: null,
    banExpires: null,
    ...overrides,
  } as User;
}

describe('Credit Gate Logic', () => {
  describe('checkUserCredits', () => {
    it('returns hasCredits=false when user has 0 credits', () => {
      const user = createTestUser({ freeCredits: 0, level: 'free' });
      const result = checkUserCredits(user, 1);

      expect(result.hasCredits).toBe(false);
      expect(result.remainingCredits).toBe(0);
      expect(result.isUnlimited).toBe(false);
    });

    it('returns hasCredits=false when user has fewer credits than required', () => {
      const user = createTestUser({ freeCredits: 1, level: 'free' });
      const result = checkUserCredits(user, 2);

      expect(result.hasCredits).toBe(false);
      expect(result.remainingCredits).toBe(1);
    });

    it('returns hasCredits=true when user has exact credits required', () => {
      const user = createTestUser({ freeCredits: 2, level: 'free' });
      const result = checkUserCredits(user, 2);

      expect(result.hasCredits).toBe(true);
      expect(result.remainingCredits).toBe(2);
    });

    it('returns hasCredits=true when user has more credits than required', () => {
      const user = createTestUser({ freeCredits: 10, level: 'free' });
      const result = checkUserCredits(user, 2);

      expect(result.hasCredits).toBe(true);
      expect(result.remainingCredits).toBe(10);
    });

    it('treats NULL freeCredits as default 10 for legacy users', () => {
      const user = createTestUser({ freeCredits: null, level: 'free' });
      const result = checkUserCredits(user, 5);

      expect(result.hasCredits).toBe(true);
      expect(result.remainingCredits).toBe(10);
    });
  });

  describe('checkUserChatMessages', () => {
    it('returns hasMessages=false when user has 0 messages', () => {
      const user = createTestUser({ freeChatMessages: 0, level: 'free' });
      const result = checkUserChatMessages(user);

      expect(result.hasMessages).toBe(false);
      expect(result.remainingMessages).toBe(0);
      expect(result.isUnlimited).toBe(false);
    });

    it('returns hasMessages=true when user has messages remaining', () => {
      const user = createTestUser({ freeChatMessages: 15, level: 'free' });
      const result = checkUserChatMessages(user);

      expect(result.hasMessages).toBe(true);
      expect(result.remainingMessages).toBe(15);
    });

    it('treats NULL freeChatMessages as default 20 for legacy users', () => {
      const user = createTestUser({ freeChatMessages: null, level: 'free' });
      const result = checkUserChatMessages(user);

      expect(result.hasMessages).toBe(true);
      expect(result.remainingMessages).toBe(20);
    });
  });

  describe('Paid user bypass', () => {
    it('allows paid users with 0 credits (unlimited)', () => {
      const user = createTestUser({
        freeCredits: 0,
        level: 'paid',
        renewalPeriod: 'lifetime',
      });
      const result = checkUserCredits(user, 100);

      expect(result.hasCredits).toBe(true);
      expect(result.remainingCredits).toBe(Infinity);
      expect(result.isUnlimited).toBe(true);
    });

    it('allows paid users with 0 chat messages (unlimited)', () => {
      const user = createTestUser({
        freeChatMessages: 0,
        level: 'paid',
        renewalPeriod: 'lifetime',
      });
      const result = checkUserChatMessages(user);

      expect(result.hasMessages).toBe(true);
      expect(result.remainingMessages).toBe(Infinity);
      expect(result.isUnlimited).toBe(true);
    });

    it('hasUnlimitedAccess returns true for lifetime paid users', () => {
      const user = createTestUser({
        level: 'paid',
        renewalPeriod: 'lifetime',
      });

      expect(hasUnlimitedAccess(user)).toBe(true);
    });

    it('hasUnlimitedAccess returns true for yearly paid users with valid subscription', () => {
      const user = createTestUser({
        level: 'paid',
        renewalPeriod: 'yearly',
        lastPayment: new Date(), // Just paid
      });

      expect(hasUnlimitedAccess(user)).toBe(true);
    });

    it('hasUnlimitedAccess returns false for expired yearly subscription', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const user = createTestUser({
        level: 'paid',
        renewalPeriod: 'yearly',
        lastPayment: twoYearsAgo,
      });

      expect(hasUnlimitedAccess(user)).toBe(false);
    });
  });

  describe('Demo user bypass', () => {
    it('allows demo users with 0 credits (unlimited)', () => {
      const user = createTestUser({
        freeCredits: 0,
        level: 'demo',
      });
      const result = checkUserCredits(user, 100);

      expect(result.hasCredits).toBe(true);
      expect(result.remainingCredits).toBe(Infinity);
      expect(result.isUnlimited).toBe(true);
    });

    it('allows demo users with 0 chat messages (unlimited)', () => {
      const user = createTestUser({
        freeChatMessages: 0,
        level: 'demo',
      });
      const result = checkUserChatMessages(user);

      expect(result.hasMessages).toBe(true);
      expect(result.remainingMessages).toBe(Infinity);
      expect(result.isUnlimited).toBe(true);
    });

    it('hasUnlimitedAccess returns true for demo users', () => {
      const user = createTestUser({ level: 'demo' });

      expect(hasUnlimitedAccess(user)).toBe(true);
    });
  });

  describe('Legacy tier handling', () => {
    it('treats legacy basic level as free (no unlimited access)', () => {
      const user = createTestUser({
        level: 'basic' as any,
        freeCredits: 0,
      });

      expect(hasUnlimitedAccess(user)).toBe(false);
    });

    it('treats legacy pro level as free (no unlimited access)', () => {
      const user = createTestUser({
        level: 'pro' as any,
        freeCredits: 0,
      });

      expect(hasUnlimitedAccess(user)).toBe(false);
    });
  });

  describe('Subscription status details', () => {
    it('returns correct status for lifetime subscription', () => {
      const user = createTestUser({
        level: 'paid',
        renewalPeriod: 'lifetime',
      });
      const status = getSubscriptionStatus(user);

      expect(status.isActive).toBe(true);
      expect(status.type).toBe('lifetime');
      expect(status.expiresAt).toBeUndefined();
      expect(status.daysRemaining).toBeUndefined();
    });

    it('returns correct status with daysRemaining for yearly subscription', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const user = createTestUser({
        level: 'paid',
        renewalPeriod: 'yearly',
        lastPayment: thirtyDaysAgo,
      });
      const status = getSubscriptionStatus(user);

      expect(status.isActive).toBe(true);
      expect(status.type).toBe('yearly');
      expect(status.expiresAt).toBeDefined();
      // Should be approximately 335 days remaining (365 - 30)
      expect(status.daysRemaining).toBeGreaterThan(330);
      expect(status.daysRemaining).toBeLessThan(340);
    });

    it('returns correct status for free user', () => {
      const user = createTestUser({ level: 'free' });
      const status = getSubscriptionStatus(user);

      expect(status.isActive).toBe(false);
      expect(status.type).toBe('free');
    });

    it('returns correct status for demo user', () => {
      const user = createTestUser({ level: 'demo' });
      const status = getSubscriptionStatus(user);

      expect(status.isActive).toBe(true);
      expect(status.type).toBe('demo');
    });
  });
});
