import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Layers } from 'lucide-react';

export function HybridApproach() {
  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="max-w-4xl mx-auto border-[oklch(0.65_0.25_262)] dark:border-[oklch(0.7_0.25_262)]">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="size-12 rounded-full bg-[oklch(0.65_0.25_262)]/10 dark:bg-[oklch(0.7_0.25_262)]/10 flex items-center justify-center">
                <Layers className="size-6 text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)]" />
              </div>
            </div>
            <CardTitle className="text-2xl sm:text-3xl">
              Best of Both Worlds
            </CardTitle>
            <CardDescription className="text-base">
              Hybrid Approach
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground">
              Use CLI + your LLM for extraction (unlimited, private, cheap),
              subscribe for cloud document generation
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-6">
              <div className="text-center">
                <div className="font-semibold text-lg mb-1">Local Ollama</div>
                <div className="text-sm text-muted-foreground">
                  Free extraction
                </div>
              </div>
              <div className="text-2xl text-muted-foreground">→</div>
              <div className="text-center">
                <div className="font-semibold text-lg mb-1">Achievements</div>
                <div className="text-sm text-muted-foreground">
                  Stored in cloud
                </div>
              </div>
              <div className="text-2xl text-muted-foreground">→</div>
              <div className="text-center">
                <div className="font-semibold text-lg mb-1">Cloud Reports</div>
                <div className="text-sm text-muted-foreground">$45/year</div>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Use Case:</p>
              <p className="text-sm text-muted-foreground">
                Extract locally with Ollama (free), generate reports in cloud
                ($45/year or $99 lifetime). Perfect for developers who want
                maximum privacy during extraction but convenience for document
                generation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
