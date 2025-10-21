import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';

export function OpenSourceTransparency() {
  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            Open Source Transparency
          </h2>
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Github className="size-8" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-4">
              Full Source Code Available
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left max-w-md mx-auto">
              <li>• Audit exactly what data is sent where</li>
              <li>• Community security reviews welcome</li>
              <li>• Transparent development process</li>
            </ul>
            <Button asChild>
              <a
                href="https://github.com/edspencer/bragdoc-ai"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="size-4 mr-2" />
                View on GitHub
              </a>
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
}
