import { Check } from 'lucide-react';

export function Compliance() {
  const items = [
    'GDPR compliant',
    'Data export/deletion rights',
    'Clear data retention policies',
    'No data selling or sharing',
    'Transparent privacy policy',
  ];

  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Compliance & Standards
          </h2>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
