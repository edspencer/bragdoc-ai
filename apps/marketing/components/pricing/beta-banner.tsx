import { Sparkles } from 'lucide-react';

export function BetaBanner() {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-700 dark:to-purple-600 text-white py-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3 text-center">
          <Sparkles className="size-5 shrink-0" />
          <div>
            <p className="font-bold text-base sm:text-lg">
              OPEN BETA - All Features Currently{' '}
              <span className="text-green-300">FREE</span>
            </p>
            <p className="text-sm sm:text-base opacity-95">
              Sign up now and get <strong>one year free</strong> when we launch
              paid plans
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
