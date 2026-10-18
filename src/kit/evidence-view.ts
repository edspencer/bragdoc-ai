// The evidence view model the kit draws (evidence.tsx EvidenceView), in a plain .ts file so code that maps stored
// evidence to it (src/board/evidence.ts) can be unit-tested without JSX.

export type EvidenceView =
  | { kind: 'image'; src: string; alt: string; caption?: string; full?: string }
  | { kind: 'pdf'; title: string; pages?: number; bytes?: number; href?: string }
  | { kind: 'file'; name: string; bytes?: number; href?: string }
  | { kind: 'link'; url: string; title?: string }
  /** `title` is missing when GitHub isn't connected: the slab shows `owner/repo#n` instead. */
  | { kind: 'github_pr'; repo: string; number: number; title?: string; url?: string; mergedAt?: string; additions?: number; deletions?: number }
  | { kind: 'quote'; text: string; from?: string; where?: string };
