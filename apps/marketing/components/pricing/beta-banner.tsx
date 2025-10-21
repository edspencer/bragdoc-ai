import { Sparkles } from 'lucide-react';

export function BetaBanner() {
  return (
    <div className="bg-gradient-to-r from-[oklch(0.65_0.25_262)] to-[oklch(0.7_0.25_280)] dark:from-[oklch(0.7_0.25_262)] dark:to-[oklch(0.75_0.25_280)] text-white py-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3 text-center">
          <Sparkles className="size-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm sm:text-base">
              Early Beta - All cloud AI features currently FREE
            </p>
            <p className="text-xs sm:text-sm opacity-90">
              Lock in early pricing when we launch
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
