import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, Brain, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export function WhyItMattersTeaserV3() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Why Every Developer Needs a Brag Doc
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The career advice everyone gives, but nobody actually follows —
            until now.
          </p>
        </div>

        <Card className="border-2 mb-8">
          <CardContent className="py-8">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="size-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="size-8 text-destructive" />
                </div>
                <h3 className="font-semibold text-lg mb-2">The Advice</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Julia Evans, Jeff Morhous, and countless others say: "Keep a
                  brag doc!"
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="size-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                  <Brain className="size-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">The Reality</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You start an achievements.txt file, forget to update it, and
                  scramble during review season.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="size-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">The Solution</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  BragDoc automatically tracks your achievements from Git. No
                  manual work required.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-muted/50 rounded-xl p-8 text-center">
          <p className="text-lg mb-6 leading-relaxed max-w-2xl mx-auto">
            <span className="font-semibold">Here's the truth:</span> Forgetting
            your wins costs you promotions and raises. Manual tracking doesn't
            work. BragDoc makes expert advice actually actionable.
          </p>
          <Button size="lg" asChild>
            <Link href="/why-it-matters">
              Read the Full Story
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
