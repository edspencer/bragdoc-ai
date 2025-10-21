import { Card, CardContent } from '@/components/ui/card';
import { FileText, TrendingDown, TrendingUp } from 'lucide-react';

export function PersonalStory() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            A Personal Experience
          </h2>
          <p className="text-lg text-muted-foreground">
            This problem is real — and it affects even the most organized
            developers.
          </p>
        </div>

        <div className="space-y-8">
          {/* The Good Times */}
          <Card className="border-2 border-green-500/20 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">
                    When I Kept an achievements.txt File
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    I used to maintain a simple text file where I'd jot down my
                    wins whenever I remembered. When performance review time
                    came around every 6 months, I had a solid foundation to work
                    from. Writing my self-review was straightforward, and I
                    could confidently showcase my contributions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* The Bad Times */}
          <Card className="border-2 border-red-500/20 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">
                    When I Forgot to Update It
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    But there were times when I neglected that file for months.
                    When performance review season arrived, I'd spend hours —
                    sometimes days — racking my brain trying to remember what
                    I'd accomplished. It was stressful, inefficient, and I know
                    for certain I forgot important achievements, both large and
                    small.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* The Realization */}
          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">The Lesson</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Having a brag doc is incredibly valuable — but only if you
                    actually maintain it. The problem isn't that developers
                    don't understand the value. The problem is that manual
                    tracking doesn't fit into the reality of daily development
                    work.
                  </p>
                  <p className="font-semibold text-foreground">
                    That's exactly why we built BragDoc: to make achievement
                    tracking automatic and effortless.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
