// Full-text search over achievements (SPEC R2): MiniSearch over the title, summary, body, and the evidence's titles,
// URLs, quotes and OCR text. In memory, rebuilt at boot and updated as files change; nothing is written to disk.
import MiniSearch from 'minisearch';
import type { Achievement, EvidenceSidecar } from '../../shared/schema/index.js';

interface Doc {
  id: string;
  title: string;
  summary: string;
  body: string;
  evidence: string;
}

export class SearchIndex {
  private ms = new MiniSearch<Doc>({
    fields: ['title', 'summary', 'body', 'evidence'],
    searchOptions: { boost: { title: 3, summary: 2 }, prefix: true, fuzzy: (term) => (term.length > 4 ? 0.2 : false), combineWith: 'AND' },
  });

  /** Add or replace an achievement. `sidecar` looks up a blob's sidecar, for its OCR text. */
  put(a: Achievement, sidecar: (sha: string) => EvidenceSidecar | null | undefined): void {
    const evidence = a.evidence
      .flatMap((e) => [e.title, e.url, e.quote?.text, e.quote?.from, e.quote?.where, e.blob ? sidecar(e.blob)?.ocr?.text : undefined, e.blob ? sidecar(e.blob)?.originalName : undefined])
      .filter(Boolean)
      .join('\n');
    const doc: Doc = { id: a.id, title: a.title, summary: a.summary ?? '', body: a.body, evidence };
    if (this.ms.has(a.id)) this.ms.replace(doc);
    else this.ms.add(doc);
  }

  remove(id: string): void {
    if (this.ms.has(id)) this.ms.discard(id);
  }

  /** Matching ids, best first. */
  search(q: string): { id: string; score: number }[] {
    if (!q.trim()) return [];
    return this.ms.search(q).map((r) => ({ id: String(r.id), score: r.score }));
  }

  get size(): number {
    return this.ms.documentCount;
  }
}
