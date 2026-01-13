/**
 * Demo Mode Utilities
 *
 * Provides utilities for demo mode detection.
 * Note: Standalone demo mode has been removed. Per-user demo mode uses
 * shadow users detected via session.impersonatedBy field.
 */

/**
 * Identifies whether an email address belongs to a demo/shadow account
 * Used to identify per-user demo mode shadow users
 * @param email - Email address to check
 * @returns true if email is a demo or shadow account email
 */
export function isDemoAccount(email: string): boolean {
  return (
    (email.startsWith('demo') && email.endsWith('@bragdoc.ai')) ||
    (email.startsWith('shadow-') && email.endsWith('@demo.bragdoc.ai'))
  );
}

/**
 * Checks if demo help dialogs are enabled via environment variable
 * @returns true if NEXT_PUBLIC_DEMO_HELP_ENABLED is set to 'true'
 */
export function isDemoHelpEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_HELP_ENABLED === 'true';
}
