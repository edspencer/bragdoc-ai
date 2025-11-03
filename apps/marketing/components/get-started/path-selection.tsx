'use client';

import { PathASteps } from './path-a-steps';

export function PathSelection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <PathASteps />
        </div>
      </div>
    </section>
  );
}
