export function PricingHeader() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-balance">
          BragDoc Pricing: Free & Cloud AI Plans
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
          <span className="font-semibold text-green-600 dark:text-green-500">
            Start free with trial credits.
          </span>{' '}
          Full access at $45/year or $99 lifetime. No credit card required to
          try.
        </p>
      </div>
    </section>
  );
}
