import type { Stripe } from 'stripe';
import { NextResponse } from 'next/server';
import { stripe } from 'lib/stripe/stripe';
import { db } from '@/database/index';
import {
  user,
  type userLevelEnum,
  type renewalPeriodEnum,
} from '@/database/schema';
import { eq } from 'drizzle-orm';

async function updateUserSubscription(
  customerId: string,
  planId: string,
  email: string,
) {
  // Extract level and renewal period from planId (e.g., 'basic_monthly' -> ['basic', 'monthly'])
  const [level, renewalPeriod] = planId.split('_') as [
    (typeof userLevelEnum.enumValues)[number],
    (typeof renewalPeriodEnum.enumValues)[number],
  ];

  console.log(
    `Updating user subscription for customer ${customerId} to level ${level} and renewal period ${renewalPeriod}`,
  );

  // Update user's subscription details and store Stripe customer ID
  await db
    .update(user)
    .set({
      level,
      renewalPeriod,
      lastPayment: new Date(),
      stripeCustomerId: customerId,
    })
    .where(eq(user.email, email));
}

async function getSessionWithLineItems(sessionId: string) {
  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items.data.price'],
  });
}

async function getCustomerDetails(customerId: string) {
  return await stripe.customers.retrieve(customerId);
}

export async function POST(req: Request) {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      await (await req.blob()).text(),
      req.headers.get('stripe-signature') as string,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    // On error, log and return the error message.
    if (err! instanceof Error) console.log(err);
    console.log(`❌ Error message: ${errorMessage}`);
    return NextResponse.json(
      { message: `Webhook Error: ${errorMessage}` },
      { status: 400 },
    );
  }

  // Successfully constructed event.
  console.log('✅ Success:', event.id);

  const permittedEvents: string[] = [
    'checkout.session.completed',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'customer.subscription.deleted',
  ];

  if (permittedEvents.includes(event.type)) {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log(`💰 CheckoutSession status: ${session.payment_status}`);

          if (session.payment_status === 'paid') {
            // Retrieve the session with line items
            const expandedSession = await getSessionWithLineItems(session.id);
            const lineItems = expandedSession.line_items?.data;

            console.log(
              `Line items for session ${session.id}:`,
              lineItems?.map((item) => item.price?.product),
            );

            if (lineItems && lineItems.length > 0) {
              const price = lineItems[0]?.price as Stripe.Price;
              const planId = price.lookup_key;

              if (planId) {
                await updateUserSubscription(
                  session.customer as string,
                  planId,
                  session.customer_details?.email ?? '',
                );
              }
            }
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(
            `❌ Payment failed: ${paymentIntent.last_payment_error?.message}`,
          );

          // If this was a subscription payment, we might want to update user status
          if (paymentIntent.metadata?.planId) {
            // You might want to mark the subscription as past_due or handle differently
            console.log(
              `Payment failed for plan: ${paymentIntent.metadata.planId}`,
            );
          }
          break;
        }

        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(`💰 PaymentIntent status: ${paymentIntent.status}`);

          // Update last payment date if this was a subscription payment
          if (paymentIntent.metadata?.planId && paymentIntent.customer) {
            // Fetch customer to get their email
            const customer = await getCustomerDetails(
              paymentIntent.customer as string,
            );

            if (!customer.deleted) {
              await updateUserSubscription(
                paymentIntent.customer as string,
                paymentIntent.metadata.planId,
                customer.email ?? '',
              );
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          // When subscription is cancelled, revert user to free plan
          await db
            .update(user)
            .set({
              level: 'free',
              lastPayment: null,
            })
            .where(eq(user.stripeCustomerId, subscription.customer as string));
          break;
        }

        default:
          throw new Error(`Unhandled event: ${event.type}`);
      }
    } catch (error) {
      console.log(error);
      return NextResponse.json(
        { message: 'Webhook handler failed' },
        { status: 500 },
      );
    }
  }
  // Return a response to acknowledge receipt of the event.
  return NextResponse.json({ message: 'Received' }, { status: 200 });
}
