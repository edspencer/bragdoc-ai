import { Button } from '@/components/ui/button';

export function PricingCta() {
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-r from-[oklch(0.65_0.25_262)] to-[oklch(0.7_0.25_280)] dark:from-[oklch(0.7_0.25_262)] dark:to-[oklch(0.75_0.25_280)] text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-balance">
          Start Tracking Free Today
        </h2>
        <p className="text-lg sm:text-xl mb-8 opacity-90 max-w-2xl mx-auto text-balance">
          No credit card required • 5-minute setup • Cancel anytime
        </p>
        <Button
          size="lg"
          variant="secondary"
          className="text-lg px-8 py-6 h-auto"
          asChild
        >
          <a href="https://app.bragdoc.ai/login">Get Started</a>
        </Button>
      </div>
    </section>
  );
}
