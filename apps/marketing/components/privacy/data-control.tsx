import { Card } from '@/components/ui/card';
import { Download, Trash, Key, Eye } from 'lucide-react';

export function DataControl() {
  const controls = [
    {
      icon: Download,
      title: 'Export Anytime',
      description:
        'Download all your data as JSON. No lock-in, fully portable.',
    },
    {
      icon: Trash,
      title: 'Delete Anytime',
      description: 'Permanent account deletion. GDPR compliant.',
    },
    {
      icon: Key,
      title: 'Revoke Access',
      description: 'Remove CLI tokens from any device. Instant revocation.',
    },
    {
      icon: Eye,
      title: 'Audit Logs',
      description:
        'See what data was accessed (coming soon). Full transparency.',
    },
  ];

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Complete Data Control
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {controls.map((control) => (
              <Card
                key={control.title}
                className="p-6 hover:border-primary transition-colors"
              >
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <control.icon className="size-6" />
                </div>
                <h3 className="font-semibold mb-2">{control.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {control.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
