import type { Stripe } from 'stripe';
import { stripe } from './stripe';
import { user } from '@bragdoc/database/schema';
import { eq } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';

type DrizzleTx = PgTransaction<any, any, any>;

interface UserLookup {
  userId: string;
  lookupMethod: 'customerId' | 'email';
}

/**
 * Find user by stripeCustomerId (preferred) or email (fallback).
 * Returns null if user not found.
 *
 * IMPORTANT: Do NOT log email or other PII here per SUBSCRIPTION-07.
 */
export async function findUserForWebhook(
  tx: DrizzleTx,
  customerId: string | null,
  email: string | null,
): Promise<UserLookup | null> {
  // Try stripeCustomerId first (reliable even if email changes)
  if (customerId) {
    const byCustomerId = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.stripeCustomerId, customerId))
      .limit(1);

    if (byCustomerId.length > 0 && byCustomerId[0]) {
      return { userId: byCustomerId[0].id, lookupMethod: 'customerId' };
    }
  }

  // Fallback to email (for first purchase before stripeCustomerId is set)
  if (email) {
    const byEmail = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (byEmail.length > 0 && byEmail[0]) {
      // Return lookup method for metrics, but do NOT log the email value
      return { userId: byEmail[0].id, lookupMethod: 'email' };
    }
  }

  return null;
}

/**
 * Handle checkout.session.completed event.
 * Upgrades user to paid status based on plan type (yearly or lifetime).
 */
export async function handleCheckoutComplete(
  tx: DrizzleTx,
  session: Stripe.Checkout.Session,
): Promise<void> {
  // Skip unpaid checkouts
  if (session.payment_status !== 'paid') {
    return;
  }

  // Retrieve session with line items to get price details
  const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items.data.price'],
  });

  const price = expandedSession.line_items?.data[0]?.price;
  if (!price) {
    throw new Error(`No price found for checkout session ${session.id}`);
  }

  // Determine plan type from price
  // - one_time = lifetime purchase
  // - recurring = yearly subscription
  const isLifetime = price.type === 'one_time';
  const renewalPeriod = isLifetime ? 'lifetime' : 'yearly';

  // Find user
  const userLookup = await findUserForWebhook(
    tx,
    session.customer as string | null,
    session.customer_details?.email ?? null,
  );

  if (!userLookup) {
    throw new Error(`User not found for checkout session ${session.id}`);
  }

  // Update user subscription in single UPDATE
  await tx
    .update(user)
    .set({
      level: 'paid',
      renewalPeriod,
      lastPayment: new Date(),
      stripeCustomerId: session.customer as string,
    })
    .where(eq(user.id, userLookup.userId));
}

/**
 * Handle invoice.paid event (subscription renewals).
 * Updates lastPayment date for yearly subscribers.
 */
export async function handleInvoicePaid(
  tx: DrizzleTx,
  invoice: Stripe.Invoice,
): Promise<void> {
  // Only process subscription invoices (not one-time payments)
  // billing_reason indicates if this invoice is subscription-related
  const subscriptionBillingReasons = [
    'subscription_create',
    'subscription_cycle',
    'subscription_update',
    'subscription_threshold',
  ];

  if (
    !invoice.billing_reason ||
    !subscriptionBillingReasons.includes(invoice.billing_reason)
  ) {
    return;
  }

  const customerId = invoice.customer as string;
  if (!customerId) {
    return;
  }

  // Update last payment date
  await tx
    .update(user)
    .set({
      lastPayment: new Date(),
    })
    .where(eq(user.stripeCustomerId, customerId));
}

/**
 * Handle customer.subscription.deleted event.
 * Reverts yearly subscribers to free tier (skips lifetime users).
 */
export async function handleSubscriptionDeleted(
  tx: DrizzleTx,
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId = subscription.customer as string;
  if (!customerId) {
    return;
  }

  // Check if user is lifetime (shouldn't have subscriptions, but guard anyway)
  const userRecord = await tx
    .select({ renewalPeriod: user.renewalPeriod })
    .from(user)
    .where(eq(user.stripeCustomerId, customerId))
    .limit(1);

  // Skip if lifetime user (one-time purchase, not subscription)
  if (userRecord[0]?.renewalPeriod === 'lifetime') {
    return;
  }

  // Revert to free tier
  await tx
    .update(user)
    .set({
      level: 'free',
      lastPayment: null,
    })
    .where(eq(user.stripeCustomerId, customerId));
}
