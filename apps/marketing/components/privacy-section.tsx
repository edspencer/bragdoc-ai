import type React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Eye, Server } from 'lucide-react';
import Link from 'next/link';

export function PrivacySection() {
  return (
    <section id="privacy" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto max-w-4xl">
        <Card className="p-12 space-y-8 bg-card border-2 border-primary/20">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Shield className="h-8 w-8" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-balance">
              Your Code Never Leaves Your Machine
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              We take privacy seriously. BragDoc's CLI runs entirely on your
              local machine, analyzing commits without ever sending your code to
              our servers.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <PrivacyFeature
              icon={<Lock className="h-5 w-5" />}
              title="Local Processing"
              description="All analysis happens on your computer"
            />
            <PrivacyFeature
              icon={<Eye className="h-5 w-5" />}
              title="You Control Data"
              description="Choose what to sync to the cloud"
            />
            <PrivacyFeature
              icon={<Server className="h-5 w-5" />}
              title="Encrypted Storage"
              description="End-to-end encryption for synced data"
            />
          </div>

          <div className="text-center pt-4">
            <Button variant="link" className="text-primary" asChild>
              <Link href="/privacy">
                Learn how BragDoc protects your privacy →
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}

function PrivacyFeature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center space-y-2">
      <div className="flex justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
