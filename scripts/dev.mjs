// `npm run dev`: Vite with hot reload on $PORT (default 2724), proxying /api to the server (run from source with
// `tsx watch`) on the next port up. $HOST is where Vite listens (default 127.0.0.1); the API always stays on 127.0.0.1,
// since only Vite talks to it. Use a throwaway data home: `BRAGDOC_HOME=$(mktemp -d) npm run dev`.
// Hallway's dev script, moved into a file so the ports are computed the same way on every platform.
import { spawn } from 'node:child_process';
import os from 'node:os';

const DEFAULT_PORT = 2724; // server/port.ts (a plain .mjs can't import TypeScript)
const webPort = Number(process.env.PORT || DEFAULT_PORT);
const apiPort = Number(process.env.BRAGDOC_API_PORT || webPort + 1);
// Both children get the same environment: the server reads PORT and BRAGDOC_DEV (API only, no static files), Vite
// reads BRAGDOC_WEB_PORT and BRAGDOC_API_PORT (vite.config.ts).
// Vite on anything but loopback is reachable from the network, with no login in front of the data home: the same rule
// as `bragdoc serve --host` (D10, D21).
const host = process.env.HOST || '127.0.0.1';
if (!['127.0.0.1', 'localhost', '::1'].includes(host) && process.env.BRAGDOC_DANGEROUSLY_ALLOW_OPEN !== '1') {
  console.error(`dev: refusing HOST=${host}: anyone who can reach it could read and change the data home. Unset HOST, or set BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1 if you really mean it.`);
  process.exit(1);
}
const env = { ...process.env, PORT: String(apiPort), BRAGDOC_DEV: '1', BRAGDOC_WEB_PORT: String(webPort), BRAGDOC_API_PORT: String(apiPort) };

const child = spawn('npx', ['concurrently', '-k', '-n', 'api,web', 'tsx watch server/cli.ts serve', 'vite'], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
// killed by a signal: exit non-zero (128 + the signal's number, as a shell would), never 0
child.on('exit', (code, signal) => process.exit(code ?? 128 + (os.constants.signals[signal] ?? 0)));
