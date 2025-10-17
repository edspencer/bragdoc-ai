'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { createDemoAccountAction } from './actions';

/**
 * Client component for demo account creation
 *
 * Displays a button that creates a demo account and redirects to dashboard on success.
 * Shows loading state during account creation.
 */
export function DemoForm() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateDemo = async () => {
    setIsCreating(true);
    try {
      const result = await createDemoAccountAction();

      if (result.status === 'success') {
        toast.success('Demo account created! Redirecting...');
        router.push('/dashboard');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to create demo account');
        setIsCreating(false);
      }
    } catch (error) {
      toast.error('An error occurred');
      setIsCreating(false);
    }
  };

  return (
    <Button
      onClick={handleCreateDemo}
      disabled={isCreating}
      className="w-full"
      size="lg"
    >
      {isCreating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating demo account...
        </>
      ) : (
        'Try Demo Mode'
      )}
    </Button>
  );
}
