import { Card } from '@/components/ui/card';
import { Lock, Brain, Cloud, ArrowRight } from 'lucide-react';

export function ArchitectureDiagram() {
  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Three-Layer Privacy Architecture
          </h2>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {/* Layer 1 */}
            <Card className="p-6 relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Lock className="size-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Your Machine</h3>
                  <span className="text-2xl">🔒</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Your code stays here</li>
                <li>• CLI reads git metadata only</li>
                <li>• Nothing sent without your permission</li>
              </ul>
              <ArrowRight className="hidden md:block absolute -right-8 top-1/2 -translate-y-1/2 size-6 text-muted-foreground" />
            </Card>

            {/* Layer 2 */}
            <Card className="p-6 relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Brain className="size-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Your LLM</h3>
                  <span className="text-2xl">🧠</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• You choose: OpenAI, Anthropic, Google, Ollama</li>
                <li>• Git metadata analyzed here</li>
                <li>• Returns achievements only</li>
              </ul>
              <ArrowRight className="hidden md:block absolute -right-8 top-1/2 -translate-y-1/2 size-6 text-muted-foreground" />
            </Card>

            {/* Layer 3 */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Cloud className="size-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">BragDoc Cloud</h3>
                  <span className="text-2xl">☁️</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Only achievements stored</li>
                <li>• You control what's sent</li>
                <li>• Open source & auditable</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
