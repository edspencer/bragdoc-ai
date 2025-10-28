/**
 * Better Auth Client Instance
 *
 * Client-side authentication instance for React components.
 * Provides hooks and methods for:
 * - Session management (useSession)
 * - Sign in (email magic links, OAuth)
 * - Sign out
 * - Session status
 *
 * Usage in components:
 * ```typescript
 * import { useSession, signIn, signOut } from '@/lib/better-auth/client'
 *
 * function MyComponent() {
 *   const { data: session, isPending } = useSession()
 *
 *   if (isPending) return <div>Loading...</div>
 *   if (!session) return <button onClick={() => signIn.social({ provider: 'google' })}>Sign In</button>
 *
 *   return <button onClick={() => signOut()}>Sign Out</button>
 * }
 * ```
 */

import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';

/**
 * Create Better Auth client instance
 *
 * Configuration:
 * - baseURL: Uses NEXT_PUBLIC_APP_URL or defaults to current origin
 * - Plugins: Magic link client for email authentication
 */
export const { useSession, signIn, signOut, signUp, $Infer } = createAuthClient(
  {
    baseURL:
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== 'undefined' ? window.location.origin : ''),
    plugins: [magicLinkClient()],
  },
);

/**
 * Re-export for convenience
 */
export { createAuthClient };
