import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Quote, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function WhyItMattersTeaserV1() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <AlertCircle className="size-4" />
            Why This Matters
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Forgetting Your Wins Costs You Promotions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Industry experts agree: tracking your achievements is critical for
            career growth. But manual tracking fails.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Julia Evans Quote */}
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="shrink-0 size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Quote className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Julia Evans</h3>
                  <p className="text-sm text-muted-foreground">
                    Software Engineer
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                "If you do great work at your job, people won't automatically
                recognize and reward you for it."
              </p>
            </CardContent>
          </Card>

          {/* Jeff Morhous Quote */}
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="shrink-0 size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Quote className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Jeff Morhous</h3>
                  <p className="text-sm text-muted-foreground">
                    Developer Advocate
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                "A brag doc is one of the most powerful career tools you can
                have."
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button size="lg" asChild>
            <Link href="/why-it-matters">
              Learn Why Brag Docs Are Essential
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
