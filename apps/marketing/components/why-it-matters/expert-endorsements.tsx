import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ExpertEndorsements() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            The Experts Agree
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Industry leaders have been recommending brag docs for years — but
            few developers actually maintain them.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Julia Evans */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Quote className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Julia Evans</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Software Engineer & Technical Writer
                  </p>
                </div>
              </div>

              <blockquote className="text-muted-foreground italic leading-relaxed border-l-4 border-primary/30 pl-4">
                "There's this idea that, if you do great work at your job,
                people will (or should!) automatically recognize that work and
                reward you for it with promotions / increased pay. In practice,
                it's often more complicated than that."
              </blockquote>

              <Button variant="link" className="h-auto p-0 text-sm" asChild>
                <a
                  href="https://jvns.ca/blog/brag-documents/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read Julia's article on brag documents
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Jeff Morhous */}
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Quote className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Jeff Morhous</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Software Engineer & Developer Advocate
                  </p>
                </div>
              </div>

              <blockquote className="text-muted-foreground italic leading-relaxed border-l-4 border-primary/30 pl-4">
                "A brag doc is a living document that tracks your
                accomplishments, big wins, and growth over time. It's your
                personal highlight reel — and it's one of the most powerful
                career tools you can have."
              </blockquote>

              <Button variant="link" className="h-auto p-0 text-sm" asChild>
                <a
                  href="https://dev.to/jeffmorhous/software-engineers-need-a-brag-doc-6on"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read Jeff's article on brag docs
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
