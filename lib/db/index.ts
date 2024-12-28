import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
if (process.env.NODE_ENV === 'test') {
  config({ path: '.env.test' });
} else {
  config();
}

// Use test database URL in test environment
export const dbUrl = process.env.NODE_ENV === 'test' 
  ? (process.env.TEST_POSTGRES_URL || 'postgres://localhost:5432/bragai-test')
  : process.env.POSTGRES_URL!;

if (!dbUrl) {
  throw new Error('Database connection string not found');
}

export const connection = postgres(dbUrl);
export const db = drizzle(connection);
