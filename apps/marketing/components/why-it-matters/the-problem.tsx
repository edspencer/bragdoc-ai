import { Card } from '@/components/ui/card';
import { AlertCircle, Calendar, Clock, Frown } from 'lucide-react';

export function TheProblem() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            The Reality of Daily Development
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            In the chaos of production systems, sprint deadlines, and constant
            context switching, tracking achievements falls to the bottom of the
            priority list.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 space-y-3 border-2">
            <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-semibold">No Time to Document</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Between meetings, code reviews, and firefighting, who has time to
              maintain an achievements.txt file?
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-2">
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-semibold">Easy to Forget</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              That critical bug fix from 3 months ago? The performance
              optimization? Already forgotten.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-2">
            <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="font-semibold">Performance Review Panic</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Scrambling to remember 6 months of work in a weekend is stressful
              and inefficient.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-2">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Frown className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold">Missed Opportunities</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Without documentation, your best work goes unrecognized, affecting
              promotions and raises.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
