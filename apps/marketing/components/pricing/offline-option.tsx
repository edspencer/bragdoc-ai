import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import Link from 'next/link';

export function OfflineOption() {
  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-green-600 dark:text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl sm:text-3xl">
              100% Offline Option
            </CardTitle>
            <CardDescription className="text-base">
              Complete Privacy & Zero Cost
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-green-600 dark:text-green-500">
                    1
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    Self-host BragDoc web app on your infrastructure
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Full control over your data and deployment
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-green-600 dark:text-green-500">
                    2
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    Configure CLI to use local Ollama
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Run AI models completely offline
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-green-600 dark:text-green-500">
                    3
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    Point CLI at your self-hosted instance
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All data stays within your network
                  </p>
                </div>
              </li>
            </ul>
            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
              <p className="font-semibold text-green-700 dark:text-green-400 mb-2">
                Result: Zero cloud, zero cost, complete privacy
              </p>
              <p className="text-sm text-muted-foreground">
                Perfect for enterprises, security-sensitive environments, or
                anyone who wants complete control. Great for learning and
                experimentation too.
              </p>
            </div>
            <div className="flex justify-center">
              <Button variant="outline" asChild>
                <Link href="/self-hosting">View Self-Hosting Docs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
