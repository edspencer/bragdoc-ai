import type { Stripe } from 'stripe';
import { NextResponse } from 'next/server';
import { stripe } from 'lib/stripe/stripe';
import { db } from '@/database/index';
import { checkEventProcessed, recordProcessedEvent } from '@bragdoc/database';
import {
  handleCheckoutComplete,
  handleInvoicePaid,
  handleSubscriptionDeleted,
} from 'lib/stripe/webhook-handlers';

const HANDLED_EVENTS = [
  'checkout.session.completed',
  'invoice.paid',
  'customer.subscription.deleted',
] as const;

type HandledEventType = (typeof HANDLED_EVENTS)[number];

function isHandledEvent(type: string): type is HandledEventType {
  return HANDLED_EVENTS.includes(type as HandledEventType);
}

export async function POST(req: Request) {
  let event: Stripe.Event;

  // 1. Verify webhook signature immediately
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 },
      );
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  // 2. Skip unhandled event types early
  if (!isHandledEvent(event.type)) {
    return NextResponse.json({ received: true, handled: false });
  }

  // 3. Check idempotency (before any processing)
  const alreadyProcessed = await checkEventProcessed(event.id);
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // 4. Process event in transaction
  try {
    await db.transaction(async (tx) => {
      // Record event first (acts as idempotency lock)
      await recordProcessedEvent(tx, event.id, event.type);

      // Handle specific event types
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutComplete(
            tx,
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case 'invoice.paid':
          await handleInvoicePaid(tx, event.data.object as Stripe.Invoice);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(
            tx,
            event.data.object as Stripe.Subscription,
          );
          break;
      }
    });
  } catch (error) {
    // Log error without PII (just event ID)
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Note: In production, use structured logger instead
    console.error(
      `Webhook processing failed for event ${event.id}: ${message}`,
    );

    // Return 500 to trigger Stripe retry
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true, handled: true });
}
