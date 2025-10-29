import Link from 'next/link';
import { Button } from './ui/button';
import { Sparkles } from 'lucide-react';
import { appPath } from '@/lib/utils';

export function DemoCTA() {
  const demoUrl = appPath('/demo');

  return (
    <div className="not-prose my-8 max-w-xl mx-auto">
      <Link href={demoUrl} className="block group">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-[2px] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="relative bg-background rounded-[10px] p-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <h4 className="font-semibold text-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  Try Demo Mode
                </h4>
                <Sparkles className="h-5 w-5 text-fuchsia-500" />
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                Instantly explore BragDoc with demo data. No sign-up, no credit
                card, no email address
              </p>
              <Button className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0 shadow-md group-hover:shadow-lg transition-all">
                Start Exploring
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
