import { Card } from '@/components/ui/card';
import { Check, X } from 'lucide-react';

export function DataAccess() {
  const doAccess = [
    'Extracted achievements (text descriptions only)',
    'Achievement metadata (dates, project names, impact ratings)',
    'Project information (names, companies, dates)',
    'User account information (email, name, preferences)',
  ];

  const neverSee = [
    'Your source code',
    'Your git diffs',
    'File contents',
    'Repository structure',
    'Proprietary information',
    'Trade secrets',
  ];

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* What We DO Access */}
            <Card className="p-6 border-green-500/20 bg-green-500/5">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Check className="size-5 text-green-500" />
                What We DO Access
              </h3>
              <ul className="space-y-3">
                {doAccess.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="size-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* What We NEVER See */}
            <Card className="p-6 border-red-500/20 bg-red-500/5">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <X className="size-5 text-red-500" />
                What We NEVER See
              </h3>
              <ul className="space-y-3">
                {neverSee.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <X className="size-5 text-red-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
