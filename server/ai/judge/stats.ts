// "You agreed with the judge on 18 of 20" (SPEC R21, D77): when you keep, merge or dismiss a candidate that has a
// verdict, whether you did what it said. Keep or merge agrees with "looks like a win"; dismiss agrees with "probably
// not". Counts only, in cache/ai/judge-stats.json (derived, deletable): never which candidate, never its text. An Undo
// while BragDoc runs takes its count back (it remembers which way each decision went, in memory, for the newest 500).
import fs from 'node:fs';
import path from 'node:path';
import { atomicWrite } from '../../atomic.js';
import type { EventBus } from '../../events.js';
import type { FoundDecision, FoundService } from '../../services/found.js';

export interface Agreement {
  agreed: number;
  of: number;
}

export interface JudgeStats {
  get(): Agreement;
  /** Listen to Found's decisions. Returns a function that stops it. */
  start(): () => void;
  /** One decision (exported for the tests; start() feeds it). */
  record(d: FoundDecision): void;
}

const REMEMBER = 500;

export function createJudgeStats({ dataDir, found, bus }: { dataDir: string; found: Pick<FoundService, 'onDecided'>; bus?: EventBus }): JudgeStats {
  const file = path.join(dataDir, 'cache', 'ai', 'judge-stats.json');
  /** id → did that decision agree (for Undo). Memory only. */
  const counted = new Map<string, boolean>();

  function get(): Agreement {
    try {
      const j = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<Agreement>;
      const n = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? x : 0);
      const of = n(j.of);
      return { agreed: Math.min(n(j.agreed), of), of };
    } catch {
      return { agreed: 0, of: 0 };
    }
  }

  function put(a: Agreement): void {
    try {
      atomicWrite(file, JSON.stringify(a) + '\n');
    } catch (e) {
      process.stderr.write(`bragdoc: couldn't save the judge's agreement count: ${(e as Error).message}\n`);
    }
    bus?.emitSoon('ai-judge', { type: 'ai-judge' }, 100, 500);
  }

  function record({ before, action }: FoundDecision): void {
    const id = before.id;
    if (action === 'undo') {
      const was = counted.get(id);
      if (was === undefined) return;
      counted.delete(id);
      const a = get();
      put({ agreed: Math.max(0, a.agreed - (was ? 1 : 0)), of: Math.max(0, a.of - 1) });
      return;
    }
    const v = before.verdict;
    if (!v) return; // never judged: nothing to agree with
    const agreed = action === 'dismiss' ? !v.keep : v.keep;
    counted.set(id, agreed);
    if (counted.size > REMEMBER) counted.delete(counted.keys().next().value!);
    const a = get();
    put({ agreed: a.agreed + (agreed ? 1 : 0), of: a.of + 1 });
  }

  return { get, record, start: () => found.onDecided(record) };
}
