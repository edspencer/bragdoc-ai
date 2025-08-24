import { NextRequest } from 'next/server';
import { stripe } from 'lib/stripe/stripe';
import { db } from 'lib/db';
import { type User, user } from 'lib/db/schema';
import { POST } from 'app/api/stripe/callback/route';
import type { Stripe } from 'stripe';
import { eq } from 'drizzle-orm';

// Mock only stripe, not db
jest.mock('@/lib/stripe/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
    checkout: {
      sessions: {
        retrieve: jest.fn(),
      },
    },
    customers: {
      retrieve: jest.fn(),
    },
  },
}));

describe('Stripe Webhook Handler', () => {
  // Test users for different scenarios
  let checkoutUser: User;
  let paymentUser: User;
  let subscriptionUser: User;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create test users with Stripe customer IDs
    checkoutUser = await db
      .insert(user)
      .values({
        email: 'checkout@test.com',
        provider: 'stripe',
        stripeCustomerId: 'cus_checkout123',
        level: 'free',
        renewalPeriod: 'monthly',
      })
      .returning()
      .then((users) => users[0]);

    paymentUser = await db
      .insert(user)
      .values({
        email: 'payment@test.com',
        provider: 'stripe',
        stripeCustomerId: 'cus_payment123',
        level: 'free',
        renewalPeriod: 'monthly',
      })
      .returning()
      .then((users) => users[0]);

    subscriptionUser = await db
      .insert(user)
      .values({
        email: 'subscription@test.com',
        provider: 'stripe',
        stripeCustomerId: 'cus_subscription123',
        level: 'basic',
        renewalPeriod: 'monthly',
        lastPayment: new Date(),
      })
      .returning()
      .then((users) => users[0]);
  });

  afterEach(async () => {
    // Clean up test users
    await db.delete(user).where(eq(user.email, 'checkout@test.com'));
    await db.delete(user).where(eq(user.email, 'payment@test.com'));
    await db.delete(user).where(eq(user.email, 'subscription@test.com'));
    jest.resetAllMocks();
  });

  it('should handle checkout.session.completed event', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test123',
          customer: checkoutUser.stripeCustomerId,
          payment_status: 'paid',
          customer_details: {
            email: checkoutUser.email,
          },
        } as Stripe.Checkout.Session,
      },
      object: 'event',
      api_version: '2023-10-16',
      created: Date.now(),
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    const mockExpandedSession = {
      line_items: {
        data: [
          {
            price: {
              lookup_key: 'basic_monthly',
            } as Stripe.Price,
          },
        ],
      },
    };

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
    (stripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue(
      mockExpandedSession
    );

    const req = new NextRequest('https://bragdoc.ai/api/stripe/callback', {
      method: 'POST',
      headers: {
        'stripe-signature': 'test_signature',
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    // Verify the stripe API calls
    expect(stripe.webhooks.constructEvent).toHaveBeenCalled();
    expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith(
      'cs_test123',
      {
        expand: ['line_items.data.price'],
      }
    );

    // Verify user subscription was updated
    const updatedUser = await db
      .select()
      .from(user)
      .where(eq(user.email, checkoutUser.email))
      .then((users) => users[0]);

    expect(updatedUser.level).toBe('basic');
    expect(updatedUser.renewalPeriod).toBe('monthly');
    expect(updatedUser.stripeCustomerId).toBe(checkoutUser.stripeCustomerId);
  });

  it('should handle payment_intent.succeeded event', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test456',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test456',
          customer: paymentUser.stripeCustomerId,
          status: 'succeeded',
          metadata: {
            planId: 'basic_monthly',
          } as Stripe.Metadata,
        } as Stripe.PaymentIntent,
      },
      object: 'event',
      api_version: '2023-10-16',
      created: Date.now(),
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    const mockCustomer: Stripe.Customer = {
      id: paymentUser.stripeCustomerId!,
      email: paymentUser.email,
      object: 'customer',
      created: Date.now(),
      livemode: false,
      metadata: {},
      currency: 'usd',
      delinquent: false,
      description: null,
      discount: null,
      invoice_prefix: 'TEST',
      name: null,
      next_invoice_sequence: 1,
      phone: null,
      preferred_locales: [],
      shipping: null,
      tax_exempt: 'none',
      test_clock: null,
      balance: 0,
      default_source: null,
      invoice_settings: {
        default_payment_method: null,
        custom_fields: null,
        rendering_options: null,
        footer: null,
      },
    };

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
    (stripe.customers.retrieve as jest.Mock).mockResolvedValue(mockCustomer);

    const req = new NextRequest('https://bragdoc.ai/api/stripe/callback', {
      method: 'POST',
      headers: {
        'stripe-signature': 'test_signature',
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    // Verify the stripe API calls
    expect(stripe.webhooks.constructEvent).toHaveBeenCalled();
    expect(stripe.customers.retrieve).toHaveBeenCalledWith(
      paymentUser.stripeCustomerId
    );

    // Verify database was updated correctly
    const updatedUser = await db
      .select()
      .from(user)
      .where(eq(user.email, paymentUser.email))
      .then((users) => users[0]);

    expect(updatedUser.level).toBe('basic');
    expect(updatedUser.renewalPeriod).toBe('monthly');
    expect(updatedUser.stripeCustomerId).toBe(paymentUser.stripeCustomerId);
    expect(updatedUser.lastPayment).toBeTruthy();
  });

  it('should handle customer.subscription.deleted event', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test789',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_test789',
          customer: subscriptionUser.stripeCustomerId,
          status: 'canceled',
        } as Stripe.Subscription,
      },
      object: 'event',
      api_version: '2023-10-16',
      created: Date.now(),
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

    const req = new NextRequest('https://bragdoc.ai/api/stripe/callback', {
      method: 'POST',
      headers: {
        'stripe-signature': 'test_signature',
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    // Verify database was updated correctly
    const updatedUser = await db
      .select()
      .from(user)
      .where(eq(user.id, subscriptionUser.id))
      .then((users) => users[0]);
    expect(updatedUser.level).toBe('free');
    expect(updatedUser.lastPayment).toBeNull();
  });

  it('should handle invalid webhook signatures', async () => {
    (stripe.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const req = new NextRequest('https://bragdoc.ai/api/stripe/callback', {
      method: 'POST',
      headers: {
        'stripe-signature': 'invalid_signature',
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    // Verify no database changes occurred
    const unchangedUser = await db
      .select()
      .from(user)
      .where(eq(user.id, checkoutUser.id))
      .then((users) => users[0]);
    expect(unchangedUser.level).toBe('free');
  });

  it('should ignore unsupported event types', async () => {
    const mockEvent: Stripe.Event = {
      id: 'evt_test999',
      type: 'charge.succeeded', // Unsupported event type
      data: {
        object: {} as Stripe.Charge,
      },
      object: 'event',
      api_version: '2023-10-16',
      created: Date.now(),
      livemode: false,
      pending_webhooks: 0,
      request: null,
    };

    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

    const req = new NextRequest('https://bragdoc.ai/api/stripe/callback', {
      method: 'POST',
      headers: {
        'stripe-signature': 'test_signature',
      },
    });

    const response = await POST(req);
    expect(response.status).toBe(200); // Still return 200 to acknowledge receipt

    // Verify no database changes occurred
    const unchangedUser = await db
      .select()
      .from(user)
      .where(eq(user.id, checkoutUser.id))
      .then((users) => users[0]);
    expect(unchangedUser.level).toBe('free');
  });
});
