'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

/**
 * Client component for demo account creation
 *
 * Uses a form submission to the API route which will set cookie and redirect.
 *
 * @param empty - If true, creates demo account without pre-populated data
 */
export function DemoForm({ empty = false }: { empty?: boolean }) {
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setIsCreating(true);
    // Form will submit naturally, triggering the API route
  };

  return (
    <form method="POST" action="/api/demo/start" onSubmit={handleSubmit}>
      {empty && <input type="hidden" name="empty" value="true" />}
      <Button type="submit" disabled={isCreating} className="w-full" size="lg">
        {isCreating ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Creating demo account...
          </>
        ) : (
          'Try Demo Mode'
        )}
      </Button>
    </form>
  );
}
