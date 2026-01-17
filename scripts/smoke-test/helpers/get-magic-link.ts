/**
 * Helper to retrieve magic link verification token from database
 *
 * Uses read-only database credentials to securely query
 * the verification table for magic link tokens.
 */
import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

/**
 * Get or create database connection pool
 */
function getPool(): pg.Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : false,
      max: 1, // Only need one connection for smoke tests
    });
  }
  return pool;
}

/**
 * Query the verification table for a magic link token
 *
 * Better Auth stores magic link data as:
 * - identifier: the token to use in the magic link URL
 * - value: JSON containing {"email": "user@example.com"}
 *
 * @param email - The email address to look up
 * @returns The verification token (identifier), or null if not found
 */
export async function getVerificationToken(
  email: string,
): Promise<string | null> {
  const pool = getPool();

  // Better Auth stores email in the `value` column as JSON: {"email":"..."}
  // The `identifier` column contains the actual token for the magic link
  const result = await pool.query<{ identifier: string }>(
    `SELECT identifier FROM verification
     WHERE value::jsonb->>'email' = $1
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [email],
  );

  return result.rows[0]?.identifier ?? null;
}

/**
 * Wait for a verification token to appear in the database
 *
 * Magic link tokens are created asynchronously after form submission,
 * so we poll for the token with a timeout.
 *
 * @param email - The email address to look up
 * @param maxWaitMs - Maximum time to wait (default: 10000ms)
 * @returns The verification token
 * @throws Error if token not found within timeout
 */
export async function waitForToken(
  email: string,
  maxWaitMs = 10000,
): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 500; // Check every 500ms

  while (Date.now() - startTime < maxWaitMs) {
    const token = await getVerificationToken(email);
    if (token) {
      return token;
    }
    await sleep(pollInterval);
  }

  throw new Error(
    `Verification token not found for ${email} after ${maxWaitMs}ms`,
  );
}

/**
 * Close the database connection pool
 * Should be called when tests are complete
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
