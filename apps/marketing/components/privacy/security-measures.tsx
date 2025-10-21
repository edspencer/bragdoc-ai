import { Check } from 'lucide-react';

export function SecurityMeasures() {
  const measures = [
    'Encrypted data transmission (TLS)',
    'Secure token storage (file permissions: 600)',
    'JWT-based authentication with expiration',
    'Webhook signature verification',
    'Regular security audits',
    'No third-party tracking scripts',
  ];

  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Security Measures
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {measures.map((measure) => (
              <div key={measure} className="flex items-start gap-3">
                <Check className="size-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm">{measure}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
