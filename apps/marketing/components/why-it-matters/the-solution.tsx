import { Card } from '@/components/ui/card';
import { Bot, FileText, GitBranch, Sparkles } from 'lucide-react';

export function TheSolution() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            BragDoc Makes It <span className="text-primary">Effortless</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We've automated the entire process so you can focus on what you do
            best: writing great code.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="p-8 space-y-4 border-2 hover:border-primary/50 transition-colors">
            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <GitBranch className="size-7 text-primary" />
            </div>
            <h3 className="font-semibold text-xl">
              Automatic Extraction from Git
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              The CLI continuously monitors your Git commits and automatically
              extracts achievements. No manual logging required — just code as
              you normally would.
            </p>
          </Card>

          <Card className="p-8 space-y-4 border-2 hover:border-primary/50 transition-colors">
            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bot className="size-7 text-primary" />
            </div>
            <h3 className="font-semibold text-xl">AI-Powered Insights</h3>
            <p className="text-muted-foreground leading-relaxed">
              Our AI analyzes your commits and generates clear, professional
              descriptions of your achievements — ready to use in performance
              reviews and manager reports.
            </p>
          </Card>

          <Card className="p-8 space-y-4 border-2 hover:border-primary/50 transition-colors">
            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="size-7 text-primary" />
            </div>
            <h3 className="font-semibold text-xl">Performance Review Ready</h3>
            <p className="text-muted-foreground leading-relaxed">
              Generate comprehensive reports for your manager and create
              compelling performance review documentation in minutes, not days.
            </p>
          </Card>

          <Card className="p-8 space-y-4 border-2 hover:border-primary/50 transition-colors">
            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="size-7 text-primary" />
            </div>
            <h3 className="font-semibold text-xl">Never Miss a Win</h3>
            <p className="text-muted-foreground leading-relaxed">
              Every bug fix, feature launch, and optimization is captured
              automatically. Your complete achievement history is always
              up-to-date and ready when you need it.
            </p>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-xl font-semibold text-foreground mb-2">
            Your work is too important to be forgotten.
          </p>
          <p className="text-lg text-muted-foreground">
            Let BragDoc make sure it never goes unseen again.
          </p>
        </div>
      </div>
    </section>
  );
}
