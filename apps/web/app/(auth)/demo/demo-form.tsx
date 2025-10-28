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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Call API route with fetch to handle JSON response
      const response = await fetch('/api/demo/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empty }),
        credentials: 'include', // Required to receive and store cookies
      });

      const data = await response.json();

      if (data.success && data.redirectTo) {
        // Cookie is now set, redirect to dashboard
        window.location.href = data.redirectTo;
      } else {
        console.error('Demo creation failed:', data.error);
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Error creating demo:', error);
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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
