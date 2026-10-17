import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { DEFAULT_PORT } from './server/port.ts';

// `npm run dev` (scripts/dev.mjs): Vite serves the web app on BRAGDOC_WEB_PORT (default 2724) and proxies /api to the
// server on BRAGDOC_API_PORT (default the next port up). HOST moves Vite off 127.0.0.1; BRAGDOC_ALLOWED_HOSTS (comma
// separated) lets a reverse proxy's hostname through Vite's own Host check, the same variable the server honours.
const webPort = Number(process.env.BRAGDOC_WEB_PORT ?? DEFAULT_PORT);
const apiPort = Number(process.env.BRAGDOC_API_PORT ?? webPort + 1);
const allowedHosts = (process.env.BRAGDOC_ALLOWED_HOSTS ?? '').split(',').map((h) => h.trim()).filter(Boolean);

export default defineConfig(({ command }) => ({
  // The component kit's showcase at /dev/kit (src/dev/Kit.tsx) is in dev (`npm run dev`) and in builds made with
  // BRAGDOC_KIT=1 (the capture rig's, tools/docs-media/), never in a release build: there the constant is false, the
  // kit page's import is dead code, and the route is a plain not-found (D33).
  define: { __BRAGDOC_KIT__: JSON.stringify(command === 'serve' || process.env.BRAGDOC_KIT === '1') },
  // The router plugin must come before react(): it generates src/routeTree.gen.ts from src/routes/ (tsr.config.json)
  // and code-splits each route.
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  server: {
    port: webPort,
    host: process.env.HOST || '127.0.0.1',
    strictPort: true,
    allowedHosts,
    proxy: { '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false } },
  },
  // the built web app, served by the compiled server (dist/server, from `npm run build:server`). BRAGDOC_WEB_OUT
  // builds somewhere else instead (test/web.test.ts builds into a temp dir).
  build: { outDir: process.env.BRAGDOC_WEB_OUT || 'dist/web', emptyOutDir: true },
}));
