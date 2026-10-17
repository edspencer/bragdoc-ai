// `npm run dev`: Vite with hot reload on $PORT (default 2724), proxying /api to the server (run from source with
// `tsx watch`) on the next port up. $HOST is where Vite listens (default 127.0.0.1); the API always stays on 127.0.0.1,
// since only Vite talks to it. Use a throwaway data home: `BRAGDOC_HOME=$(mktemp -d) npm run dev`.
// Hallway's dev script, moved into a file so the ports are computed the same way on every platform.
import { spawn } from 'node:child_process';

const DEFAULT_PORT = 2724; // server/port.ts (a plain .mjs can't import TypeScript)
const webPort = Number(process.env.PORT || DEFAULT_PORT);
const apiPort = Number(process.env.BRAGDOC_API_PORT || webPort + 1);
// Both children get the same environment: the server reads PORT and BRAGDOC_DEV (API only, no static files), Vite
// reads BRAGDOC_WEB_PORT and BRAGDOC_API_PORT (vite.config.ts).
const env = { ...process.env, PORT: String(apiPort), BRAGDOC_DEV: '1', BRAGDOC_WEB_PORT: String(webPort), BRAGDOC_API_PORT: String(apiPort) };

const child = spawn('npx', ['concurrently', '-k', '-n', 'api,web', 'tsx watch server/cli.ts serve', 'vite'], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
child.on('exit', (code) => process.exit(code ?? 0));
