'use client';

import { useFormStatus } from 'react-dom';

import { LoaderIcon } from 'components/icons';

import { Button } from './ui/button';

export function SubmitButton({
  children,
  isSuccessful,
  disabled = false,
}: {
  children: React.ReactNode;
  isSuccessful: boolean;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type={pending ? 'button' : 'submit'}
      aria-disabled={pending || isSuccessful || disabled}
      disabled={pending || isSuccessful || disabled}
      className="relative"
    >
      {children}

      {(pending || isSuccessful) && (
        <span className="animate-spin absolute right-4">
          <LoaderIcon />
        </span>
      )}

      <output aria-live="polite" className="sr-only">
        {pending || isSuccessful ? 'Loading' : 'Submit form'}
      </output>
    </Button>
  );
}
