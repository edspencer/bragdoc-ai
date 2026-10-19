// TEMPORARY (PR30) diagnostic for the macOS instructions-watch flake: repeat the scenario, with a second chokidar
// watcher and a raw fs.watch recording what the OS reports, and print it all when the store never sees the edit.
import fs from 'node:fs';
import path from 'node:path';
import { watch } from 'chokidar';
import { watchStore } from '../server/store/watch.ts';
import { storeHome } from './store-fixture.ts';

const WINS = '# What counts as a win for me\n\n- Praise.\n';
const N = Number(process.env.DIAG_N ?? 20);
let misses = 0;
for (let n = 0; n < N; n++) {
  const h = storeHome();
  h.services.instructions.put('what-counts', { text: '# start\n' });
  const log: string[] = [];
  const t0 = Date.now();
  const at = () => `${Date.now() - t0}ms`;
  const raw1 = fs.watch(h.home, (e, f) => log.push(`${at()} raw-home ${e} ${f}`));
  const raw2 = fs.watch(path.join(h.home, 'ai'), (e, f) => log.push(`${at()} raw-ai ${e} ${f}`));
  const c = watch(h.home, { ignoreInitial: true, depth: 4 }).on('all', (e, p) => log.push(`${at()} chok ${e} ${path.relative(h.home, p)}`));
  h.store.subscribe((ch) => log.push(`${at()} store ${JSON.stringify(ch)}`));
  const w = watchStore(h.store, { onError: (e) => log.push(`${at()} error ${(e as Error).message}`) });
  await w.ready;
  log.push(`${at()} ready`);
  let seen = false;
  for (let i = 0; i < 10 && !seen; i++) {
    const text = `${WINS}<!-- ${i} -->\n`;
    h.put('ai/what-counts.md', text);
    log.push(`${at()} wrote ${i}`);
    const until = Date.now() + 1000;
    while (Date.now() < until) {
      if (h.services.instructions.get('what-counts').text === text) {
        seen = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 10));
    }
  }
  if (!seen) {
    misses++;
    console.log(`MISS ${n}: home=${h.home} real=${fs.realpathSync(h.home)}\n  ${log.join('\n  ')}`);
  }
  raw1.close();
  raw2.close();
  await c.close();
  await w.close();
  h.cleanup();
}
console.log(`DIAG: ${misses} misses of ${N}`);
