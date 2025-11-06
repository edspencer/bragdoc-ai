import postgres from 'postgres';

const TEST_DB_NAME = 'bragai-test';

async function main() {
  // Create test database
  const rootClient = postgres('postgres://localhost:5432/postgres');
  try {
    // Force close all connections to test database
    await rootClient.unsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${TEST_DB_NAME}'
      AND pid <> pg_backend_pid();
    `);
    await rootClient.unsafe(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
    await rootClient.unsafe(`CREATE DATABASE "${TEST_DB_NAME}"`);
    console.log(`✓ Test database "${TEST_DB_NAME}" created successfully`);
  } finally {
    await rootClient.end();
  }

  // Connect to the new test database and enable pgvector extension
  const testClient = postgres(`postgres://localhost:5432/${TEST_DB_NAME}`);
  try {
    await testClient.unsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
    console.log(`✓ pgvector extension enabled in test database`);
  } finally {
    await testClient.end();
  }
}

main().catch(console.error);
