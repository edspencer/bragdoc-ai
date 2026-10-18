// A decision (Jev, D82) as text, for hashing: the same whether it's the SDK's request (`boolean` questions) or Jev's
// on the wire (`noul`), so a recorded decision (lib.ts) and the fake model server's view of the request (its
// /systemone route) hash alike, and a replay finds the answer that was recorded. Pure, no imports.
export function decisionAsked(state: unknown, questions: Record<string, { instructions?: unknown; criteria?: unknown }>): { system: string; prompt: string } {
  return { system: JSON.stringify(Object.entries(questions).map(([id, q]) => [id, q.instructions ?? null, q.criteria ?? null])), prompt: JSON.stringify(state) };
}
