// How data files are shaped for the HTTP API (shared/api.ts): an achievement plus its ETag, the sidecars of its
// evidence files, and whether its file is broken right now. Routes that return achievements (the board, Found's keep,
// Folio) use these, so every one looks the same to the web app.
import type { AchievementView, EvidenceFile } from '../shared/api.js';
import type { Achievement, EvidenceSidecar } from '../shared/schema/index.js';
import type { Store } from './store/index.js';

export function evidenceFile(s: EvidenceSidecar): EvidenceFile {
  return {
    sha256: s.sha256,
    mime: s.mime,
    bytes: s.bytes,
    ...(s.originalName ? { name: s.originalName } : {}),
    ...(s.width ? { width: s.width } : {}),
    ...(s.height ? { height: s.height } : {}),
    ...(s.ocr?.text ? { ocrText: s.ocr.text } : {}),
  };
}

export function achievementView(store: Store, a: Achievement): AchievementView<Achievement> {
  const entry = store.entry('achievement', a.id);
  const files: Record<string, EvidenceFile> = {};
  for (const e of a.evidence) {
    const s = e.blob ? store.get('evidence', e.blob) : undefined;
    if (s) files[s.sha256] = evidenceFile(s);
  }
  // the index's own object: copied, never mutated (AGENTS.md)
  return {
    ...a,
    etag: entry?.etag ?? null,
    files,
    ...(entry && entry.value && entry.problems.some((p) => p.code !== 'future-version') ? { broken: true as const } : {}),
    ...(entry?.readOnly ? { readOnly: true as const } : {}),
  };
}
