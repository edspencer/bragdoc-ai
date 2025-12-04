'use client';

import { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Mail, Check } from 'lucide-react';
import { signIn } from '@/lib/better-auth/client';

interface MagicLinkAuthFormProps {
  mode: 'login' | 'register';
  tosAccepted?: boolean;
  onTosChange?: (accepted: boolean) => void;
  children?: React.ReactNode;
}

export function MagicLinkAuthForm({
  mode,
  tosAccepted,
  onTosChange,
  children,
}: MagicLinkAuthFormProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    try {
      // Use Better Auth magic link sign in
      const result = await signIn.magicLink({
        email,
        callbackURL: '/dashboard',
      });

      if (result.error) {
        setError('Failed to send magic link. Please try again.');
        setIsSubmitting(false);
      } else {
        setIsEmailSent(true);
        setIsSubmitting(false);
      }
    } catch (_err) {
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="px-4 sm:px-16 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
          <Check className="w-6 h-6 text-green-600 dark:text-green-300" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Check your email</h3>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            We've sent a magic link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-500">
            Click the link in the email to{' '}
            {mode === 'login' ? 'sign in' : 'complete your registration'}.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setIsEmailSent(false);
            setEmail('');
          }}
          className="mt-4"
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 sm:px-16">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="text-zinc-600 font-normal dark:text-zinc-400"
        >
          Email Address
        </Label>

        <Input
          id="email"
          name="email"
          className="bg-muted text-md md:text-sm"
          type="email"
          placeholder="user@acme.com"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {children}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Mail className="mr-2 h-4 w-4 animate-pulse" />
            Sending magic link...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            {mode === 'login' ? 'Send magic link' : 'Continue with email'}
          </>
        )}
      </Button>
    </form>
  );
}
