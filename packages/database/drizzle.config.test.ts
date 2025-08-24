import { defineConfig } from 'drizzle-kit';

const TEST_DB_NAME = 'bragai-test';

export default defineConfig({
  schema: './src/schema.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: `postgres://localhost:5432/${TEST_DB_NAME}`,
  },
});
