/**
 * Demo Mode Utilities
 *
 * Provides utilities for demo account management including:
 * - Demo email generation
 * - Demo mode enablement checks
 * - Demo account identification
 */

/**
 * Generates a unique demo email address based on seconds since 2025-01-01
 * @returns Email address in format: demo{secondsSince2025}@bragdoc.ai
 */
export function generateDemoEmail(): string {
  const start2025 = new Date('2025-01-01T00:00:00Z').getTime();
  const now = Date.now();
  const secondsSince2025 = Math.floor((now - start2025) / 1000);
  return `demo${secondsSince2025}@bragdoc.ai`;
}

/**
 * Checks if demo mode is enabled via environment variable
 * @returns true if DEMO_MODE_ENABLED is set to 'true'
 */
export function isDemoModeEnabled(): boolean {
  return process.env.DEMO_MODE_ENABLED === 'true';
}

/**
 * Identifies whether an email address belongs to a demo account
 * @param email - Email address to check
 * @returns true if email is a demo account email
 */
export function isDemoAccount(email: string): boolean {
  return email.startsWith('demo') && email.endsWith('@bragdoc.ai');
}

/**
 * Checks if demo help dialogs are enabled via environment variable
 * @returns true if NEXT_PUBLIC_DEMO_HELP_ENABLED is set to 'true'
 */
export function isDemoHelpEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_HELP_ENABLED === 'true';
}
