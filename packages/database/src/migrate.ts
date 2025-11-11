import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'node:path';

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'test') {
  config({ path: '../../apps/web/.env.test', override: true });
} else {
  config({ path: '../.env' });

  // Also try .env.local if .env doesn't have what we need
  if (!process.env.POSTGRES_URL) {
    config({ path: '../.env.local' });
  }
}

const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const dbUrl = process.env.POSTGRES_URL;

  // Sanitize URL for logging (hide password)
  const sanitizedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
  console.log('🔗 Database:', sanitizedUrl);

  const connection = postgres(dbUrl, { max: 1 });
  const db = drizzle(connection);

  console.log('⏳ Running migrations...');

  const migrationsFolder = path.join(__dirname, 'migrations');
  console.log('📁 Migrations folder:', migrationsFolder);

  const start = Date.now();
  await migrate(db, { migrationsFolder });
  const end = Date.now();

  console.log('✅ Migrations completed successfully in', end - start, 'ms');
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');

  // Sanitize error message to avoid exposing credentials
  const errorMessage = err instanceof Error ? err.message : String(err);
  const sanitizedMessage = errorMessage.replace(
    /postgres:\/\/[^@]+@/g,
    'postgres://****@',
  );

  console.error('Error:', sanitizedMessage);

  // Log additional context if available
  if (err.code) {
    console.error('Error code:', err.code);
  }
  if (err.cause) {
    console.error('Cause:', err.cause.message || err.cause);
  }

  process.exit(1);
});
