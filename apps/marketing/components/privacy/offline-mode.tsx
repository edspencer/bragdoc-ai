import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

export function OfflineMode() {
  const steps = [
    'Self-host BragDoc web app on your infrastructure',
    'Install Ollama locally',
    'Configure CLI to use local Ollama',
    'Point CLI at self-hosted web app',
    'Result: Complete privacy, zero cloud, zero cost',
  ];

  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4 gap-2">
              <Shield className="h-3 w-3" />
              Maximum Privacy
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              100% Offline Mode
            </h2>
            <p className="text-muted-foreground">
              Perfect for enterprises, security-sensitive environments, and
              learning
            </p>
          </div>
          <Card className="p-8">
            <ol className="space-y-4">
              {steps.map((step, index) => (
                <li key={index} className="flex gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-sm">{step}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </section>
  );
}
