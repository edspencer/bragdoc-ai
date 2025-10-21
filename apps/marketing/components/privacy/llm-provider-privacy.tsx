import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Sparkles, Server } from 'lucide-react';

export function LlmProviderPrivacy() {
  const cloudProviders = [
    { name: 'OpenAI', url: 'https://openai.com/privacy' },
    { name: 'Anthropic', url: 'https://www.anthropic.com/privacy' },
    { name: 'Google', url: 'https://policies.google.com/privacy' },
    { name: 'DeepSeek', url: 'https://www.deepseek.com/privacy' },
  ];

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            LLM Provider Privacy
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Cloud Providers */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Cloud Providers</h3>
              </div>
              <ul className="space-y-3 mb-4">
                {cloudProviders.map((provider) => (
                  <li key={provider.name}>
                    <a
                      href={provider.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {provider.name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Subject to their privacy policies. You control which to use.
              </p>
            </Card>

            {/* Local Option - Highlighted */}
            <Card className="p-6 border-primary bg-primary/5 relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Recommended
              </Badge>
              <div className="flex items-center gap-2 mb-4">
                <Server className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Local Option</h3>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <p className="font-medium text-sm mb-1">Ollama</p>
                  <p className="text-xs text-muted-foreground">
                    100% local processing
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>• Nothing leaves your machine</li>
                <li>• Completely free</li>
                <li>• Full privacy</li>
              </ul>
            </Card>

            {/* Custom Endpoints */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Server className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Custom Endpoints</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li>• Use on-premise LLM servers</li>
                <li>• Complete control</li>
                <li>• Enterprise-ready</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Perfect for organizations with strict data policies.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
