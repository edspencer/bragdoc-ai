import type React from 'react';
import { Card } from '@/components/ui/card';
import { Sparkles, FolderTree, FileText } from 'lucide-react';

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance">
            Three Steps to Better Performance Reviews
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Our AI-powered workflow turns your git history into compelling
            achievement documentation
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Sparkles className="h-6 w-6" />}
            title="Auto-Extract"
            description="Our CLI analyzes your git commits using AI to identify meaningful achievements and impact"
            features={[
              'Scans commit messages',
              'Identifies key changes',
              'Extracts business value',
              'Runs locally & privately',
            ]}
          />

          <FeatureCard
            icon={<FolderTree className="h-6 w-6" />}
            title="AI-Organize"
            description="Intelligent categorization groups your work by project, impact level, and achievement type"
            features={[
              'Smart categorization',
              'Impact rating (1-5 stars)',
              'Project tagging',
              'Timeline visualization',
            ]}
          />

          <FeatureCard
            icon={<FileText className="h-6 w-6" />}
            title="AI-Document"
            description="Generate polished reports and summaries ready to share with your manager or use in reviews"
            features={[
              'One-click reports',
              'Custom templates',
              'Export to PDF/Markdown',
              'Highlight key wins',
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  features,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <Card className="p-8 space-y-6 bg-card border-border hover:border-primary/50 transition-colors">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        {icon}
      </div>

      <div className="space-y-3">
        <h3 className="text-2xl font-bold">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>

      <ul className="space-y-2 pt-4 border-t border-border">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
