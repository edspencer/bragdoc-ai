export function PricingHeader() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-balance">
          BragDoc Pricing: Free & Cloud AI Plans
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
          <span className="font-semibold text-green-600 dark:text-green-500">
            Currently in open beta - all features FREE.
          </span>{' '}
          Future pricing $4.99/month when we launch. Sign up now for one year
          free!
        </p>
      </div>
    </section>
  );
}
