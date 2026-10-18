// Text in the board's pictures (SPEC R5, R8): every picture that lands in evidence/ (pasted or dropped on the board,
// attached by an agent, a screenshot you kept from Found) is read in the background, and the text goes on its sidecar
// (`ocr`), where search finds it (store/search.ts indexes it with the achievement). Pictures added before this ran, or
// while BragDoc was stopped, are read when it starts. One at a time, through the app's one OCR queue (createOcr), which
// the screenshots source shares.
//
// GET /api/evidence/:sha/ocr reports where a picture is up to; when the screenshot rules pass on its text, the answer
// carries the quote, which the composer offers as a sticky ("Add the quote as a sticky").
import type { EvidenceOcrResponse } from '../../shared/api.js';
import { compileRules, type RulesResult } from '../../shared/rules/screenshot.js';
import type { Services } from '../services/index.js';
import { blobPath } from '../store/blobs.js';
import { NotFoundError, type Store } from '../store/index.js';
import type { Ocr } from './index.js';

export class EvidenceText {
  private queue: string[] = [];
  private queued = new Set<string>();
  /** Pictures that couldn't be read, and why: not tried again until BragDoc restarts. */
  private failed = new Map<string, string>();
  private draining: Promise<void> | null = null;
  private off: (() => void) | null = null;
  private rules: { key: string; fn: (t: string) => RulesResult } | null = null;

  constructor(private readonly o: { store: Store; services: Services; ocr: Ocr }) {}

  /** Read new pictures as they arrive, and the ones without text already there. Returns a function that stops it. */
  start(): () => void {
    this.off = this.o.store.subscribe((c) => {
      if (c.entity === 'evidence' && c.op === 'upsert') this.consider(c.id);
    });
    for (const s of this.o.store.all('evidence')) this.consider(s.sha256);
    return () => this.stop();
  }

  stop(): void {
    this.off?.();
    this.off = null;
    this.queue = [];
    this.queued.clear();
  }

  /** Resolves when nothing is waiting (tests). */
  async idle(): Promise<void> {
    while (this.draining) await this.draining;
  }

  private wanted(sha: string): boolean {
    const s = this.o.store.get('evidence', sha);
    return !!s && !s.ocr && s.mime.startsWith('image/') && !this.failed.has(sha);
  }

  private consider(sha: string): void {
    if (!this.wanted(sha) || this.queued.has(sha)) return;
    this.queue.push(sha);
    this.queued.add(sha);
    if (!this.draining)
      this.draining = this.drain().finally(() => {
        this.draining = null;
      });
  }

  private async drain(): Promise<void> {
    while (this.queue.length) {
      const sha = this.queue.shift()!;
      this.queued.delete(sha);
      if (!this.wanted(sha)) continue;
      const file = blobPath(this.o.store, sha);
      if (!file) continue;
      try {
        const r = await this.o.ocr.read({ path: file });
        // the cache may have written it already (createOcr's evidenceOcrCache); a cached answer didn't
        if (this.wanted(sha)) this.o.services.evidence.setOcr(sha, { engine: r.engine, text: r.text, at: this.o.store.now().toISOString() });
      } catch (e) {
        this.failed.set(sha, e instanceof Error ? e.message : String(e));
      }
    }
  }

  /** Where one stored file is up to. NotFoundError if there's no such file. */
  status(sha: string): EvidenceOcrResponse {
    const s = this.o.store.get('evidence', sha);
    if (!s) throw new NotFoundError(`there's no stored file ${sha}`);
    if (!s.mime.startsWith('image/')) return { status: 'none' };
    if (s.ocr) {
      const quote = this.quoteIn(s.ocr.text);
      return { status: 'done', text: s.ocr.text, engine: s.ocr.engine, ...(quote ? { quote } : {}) };
    }
    const why = this.failed.get(sha);
    if (why) return { status: 'failed', error: why };
    return { status: 'pending' };
  }

  /** The words to offer as a sticky, when the screenshot rules pass (they need your name: profile.yaml). */
  private quoteIn(text: string): EvidenceOcrResponse['quote'] | undefined {
    const p = this.o.store.profile();
    if (!p?.name?.trim() || !text.trim()) return undefined;
    const key = JSON.stringify([p.name, p.aliases, p.notMe, p.githubLogin]);
    if (this.rules?.key !== key) this.rules = { key, fn: compileRules(p) };
    const r = this.rules.fn(text);
    return r.pass && r.quote ? { text: r.quote, ...(r.from ? { from: r.from } : {}), ...(r.where ? { where: r.where } : {}) } : undefined;
  }
}
