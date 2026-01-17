/**
 * Generate a unique test email address for smoke tests
 *
 * Uses timestamp to ensure uniqueness across test runs.
 * Email pattern: smoke-test-{timestamp}@test.bragdoc.ai
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  return `smoke-test-${timestamp}@test.bragdoc.ai`;
}
