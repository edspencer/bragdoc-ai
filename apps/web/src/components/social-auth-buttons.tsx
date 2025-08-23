'use client';

import { signIn } from 'next-auth/react';
import { Github } from 'lucide-react';
import { Button } from './ui/button';

export function SocialAuthButtons() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-muted" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => signIn('google', { callbackUrl: '/chat' })}
          className="w-full"
        >
          <svg
            className="mr-2 size-4"
            aria-hidden="true"
            focusable="false"
            data-prefix="fab"
            data-icon="google"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 488 512"
          >
            <path
              fill="currentColor"
              d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
            />
          </svg>
          Google
        </Button>

        <Button
          variant="outline"
          onClick={() => signIn('github', { callbackUrl: '/chat' })}
          className="w-full"
        >
          <Github className="mr-2 size-4" />
          GitHub
        </Button>
      </div>
    </div>
  );
}
