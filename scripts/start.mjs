// `npm start` (from a checkout): build the UI (dist/web) and the server (dist/server) if either is missing or older
// than its sources, then run the compiled CLI, as an installed `bragdoc` would. Arguments are passed on, e.g.
// `npm start -- --port 5050`; `--build` forces a rebuild.
import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const force = args.includes('--build');

function newestMtime(p) {
  const st = fs.statSync(p);
  if (!st.isDirectory()) return st.mtimeMs;
  let m = st.mtimeMs;
  for (const e of fs.readdirSync(p)) m = Math.max(m, newestMtime(path.join(p, e)));
  return m;
}

const stale = (output, sources) => {
  const out = path.join(root, output);
  if (force || !fs.existsSync(out)) return true;
  const srcTime = Math.max(...sources.map((p) => path.join(root, p)).filter(fs.existsSync).map(newestMtime));
  return fs.statSync(out).mtimeMs < srcTime;
};

const builds = [
  ['build:web', 'dist/web/index.html', ['src', 'shared', 'public', 'index.html', 'vite.config.ts', 'tsr.config.json', 'package.json']],
  ['build:server', 'dist/server/cli.js', ['server', 'shared', 'tsconfig.build.json', 'tsconfig.server.json']],
];
for (const [script, output, sources] of builds) {
  if (!stale(output, sources)) continue;
  console.log(`npm run ${script}…`);
  const r = spawnSync('npm', ['run', '--silent', script], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const child = spawn(process.execPath, [path.join(root, 'dist', 'server', 'cli.js'), ...args.filter((a) => a !== '--build')], { stdio: 'inherit', env: process.env });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
child.on('exit', (code) => process.exit(code ?? 0));
