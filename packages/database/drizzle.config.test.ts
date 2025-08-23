import { defineConfig } from 'drizzle-kit';

const TEST_DB_NAME = 'bragai-test';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: `postgres://localhost:5432/${TEST_DB_NAME}`,
  },
});
