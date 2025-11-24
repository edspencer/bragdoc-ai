#!/usr/bin/env node
/**
 * Mock API server for CLI integration tests
 * Provides minimal endpoints needed for dry-run extraction tests
 */

const http = require('node:http');

const PORT = process.env.MOCK_API_PORT || 3456;

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS',
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // GET /api/sources - Return sources for all projects
  // The actual project ID is extracted from config in the shell script
  // and passed via TEST_PROJECT_ID env var (set after bragdoc init)
  // Since we can't know it ahead of time, we return a source for ANY project
  // by reading from a temp file created by the test script
  if (req.method === 'GET' && url.pathname === '/api/sources') {
    const fs = require('node:fs');
    const path = require('node:path');
    const os = require('node:os');

    try {
      // Read project ID from marker files created by the test
      // Use /tmp directly since that's where the shell script creates them
      const projectId = fs
        .readFileSync('/tmp/bragdoc-test-project-id.txt', 'utf-8')
        .trim();
      const testRepoPath = fs
        .readFileSync('/tmp/bragdoc-test-repo-path.txt', 'utf-8')
        .trim();

      const sources = [
        {
          id: 'test-source-123',
          userId: 'test-user',
          projectId: projectId,
          name: 'Test Git Source',
          type: 'git',
          config: {
            gitPath: testRepoPath,
            branchWhitelist: [],
          },
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sources }));
    } catch (error) {
      // If marker files don't exist, return empty sources object
      console.error('Error reading marker files:', error.message);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sources: [] }));
    }
    return;
  }

  // GET /api/companies - Return empty array
  if (req.method === 'GET' && url.pathname === '/api/companies') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([]));
    return;
  }

  // GET /api/projects - Return empty array
  if (req.method === 'GET' && url.pathname === '/api/projects') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([]));
    return;
  }

  // GET /api/user - Return mock user
  if (req.method === 'GET' && url.pathname === '/api/user') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      }),
    );
    return;
  }

  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`Mock API server listening on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Mock API server stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('Mock API server stopped');
    process.exit(0);
  });
});
