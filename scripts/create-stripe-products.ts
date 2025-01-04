import dotenv from 'dotenv';

dotenv.config();

// createStripeData.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  // https://github.com/stripe/stripe-node#configuration
  appInfo: {
    name: 'bragdoc.ai',
    url: 'https://bragdoc.ai',
  },
});

interface ProductInput {
  id: string;
  name: string;
  tax_code: string;
}

interface PriceInput {
  productId: string;
  unitAmount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  usageType: string;
  billingScheme: string;
  taxBehavior: string;
  lookupKey: string;
}

// Products from CSV (omitting date, description, and URL):
const products: ProductInput[] = [
  { id: 'bragger_pro', name: 'Pro Bragger', tax_code: 'txcd_10000000' },
  { id: 'bragger_basic', name: 'Basic Bragger', tax_code: 'txcd_10000000' },
];

// Prices from CSV (converted amounts to integer cents, ignoring date fields, etc.):
const prices: PriceInput[] = [
  {
    productId: 'bragger_basic', // Basic Bragger
    unitAmount: 500, // $5.00
    currency: 'usd',
    interval: 'month',
    intervalCount: 1,
    usageType: 'licensed',
    billingScheme: 'per_unit',
    taxBehavior: 'unspecified',
    lookupKey: 'basic_monthly',
  },
  {
    productId: 'bragger_basic', // Basic Bragger
    unitAmount: 3000, // $30.00
    currency: 'usd',
    interval: 'year',
    intervalCount: 1,
    usageType: 'licensed',
    billingScheme: 'per_unit',
    taxBehavior: 'unspecified',
    lookupKey: 'basic_yearly',
  },
  {
    productId: 'bragger_pro', // Pro Bragger
    unitAmount: 900, // $9.00
    currency: 'usd',
    interval: 'month',
    intervalCount: 1,
    usageType: 'licensed',
    billingScheme: 'per_unit',
    taxBehavior: 'unspecified',
    lookupKey: 'pro_monthly',
  },
  {
    productId: 'bragger_pro', // Pro Bragger
    unitAmount: 9000, // $90.00
    currency: 'usd',
    interval: 'year',
    intervalCount: 1,
    usageType: 'licensed',
    billingScheme: 'per_unit',
    taxBehavior: 'unspecified',
    lookupKey: 'pro_yearly',
  },
];

const REDIRECT_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://bragdoc.ai/chat'
    : 'https://ngrok.edspencer.net/chat';

async function createPaymentLinkForPrice(
  priceId: string,
  redirectUrl: string,
): Promise<string> {
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: priceId, quantity: 1 }],
    after_completion: {
      type: 'redirect',
      redirect: { url: redirectUrl },
    },
    tax_id_collection: { enabled: true },
  });

  return paymentLink.url;
}

async function createProductsAndPrices() {
  // Create products
  for (const product of products) {
    console.log(`Creating product: ${product.id} (${product.name})`);
    await stripe.products.create({
      id: product.id,
      name: product.name,
      tax_code: product.tax_code,
    });
  }

  // Create prices
  for (const price of prices) {
    console.log(
      `Creating price: ${price.lookupKey} for product ${price.productId}`,
    );
    const stripePrice = await stripe.prices.create({
      product: price.productId,
      lookup_key: price.lookupKey,
      unit_amount: price.unitAmount,
      currency: price.currency,
      recurring: {
        interval: price.interval as 'month' | 'year',
        interval_count: price.intervalCount,
        usage_type: price.usageType as 'licensed',
      },
      billing_scheme: price.billingScheme as 'per_unit',
      tax_behavior: price.taxBehavior as 'unspecified',
    });

    await createPaymentLinkForPrice(stripePrice.id, REDIRECT_URL);
  }
}

async function deleteProducts() {
  for (const product of products) {
    await deleteProduct(product.id);
  }
}

async function deleteProduct(productId: string) {
  try {
    // First, find and delete all payment links associated with the product's prices
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
    });

    const paymentLinks = await stripe.paymentLinks.list({
      active: true,
    });

    // Delete payment links that use any of this product's prices
    const priceIds = new Set(prices.data.map((price) => price.id));
    const relevantPaymentLinks = paymentLinks.data.filter((link) =>
      link.line_items?.data.some(
        (item) => item.price && priceIds.has(item.price.id),
      ),
    );

    //delete prices
    for (const price of prices.data) {
      console.log(`Deleting price: ${price.id}`);
      await stripe.prices.update(price.id, {
        active: false,
      });
    }

    for (const link of relevantPaymentLinks) {
      console.log(`Deactivating payment link: ${link.id}`);
      await stripe.paymentLinks.update(link.id, {
        active: false,
      });
    }

    // Delete the product (this will automatically archive associated prices)
    console.log(`Deleting product: ${productId}`);
    await stripe.products.del(productId);

    console.log(
      `Successfully deleted product ${productId} and all associated resources`,
    );
  } catch (error) {
    console.error(`Error deleting product ${productId}:`, error);
    throw error;
  }
}

async function main() {
  // await deleteProducts();
  await createProductsAndPrices();
}

// Run the script
main()
  .then(() => console.log('Successfully created all products and prices'))
  .catch((error) => {
    console.error('Error creating products and prices:', error);
    process.exit(1);
  });
