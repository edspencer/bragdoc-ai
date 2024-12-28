import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { dbUrl } from './index';

config({
  path: '.env',
});

// Also try .env.local if .env doesn't have what we need
if (!process.env.POSTGRES_URL) {
  config({
    path: '.env.local',
  });
}

const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  console.log(`Database URL: ${dbUrl}`);
  const connection = postgres(dbUrl, {max: 1});
  const db = drizzle(connection);

  console.log('⏳ Running migrations...');


  const start = Date.now();
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  const end = Date.now();

  console.log('✅ Migrations completed in', end - start, 'ms');
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});
