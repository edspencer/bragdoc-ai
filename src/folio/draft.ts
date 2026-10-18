// Folio's Draft with AI (SPEC R24, D80–D81): the draft's life in the page. It's asked for with the folio's state (the
// server rebuilds the clippings), streams in, then becomes yours to edit. It lives here only: nothing is saved to the
// data home, so a reload loses it, and leaving the page with one you haven't taken away asks first.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiDraftCheck, AiDraftEvent } from '../../shared/api.ts';
import type { FolioFilter } from '../../shared/folio.ts';
import { checkAiDraft, isApiError, streamDraft } from '../api/client.ts';

type Start = Extract<AiDraftEvent, { type: 'start' }>;

export type DraftPhase = 'waiting' | 'streaming' | 'done' | 'failed' | 'cancelled';

export interface DraftState {
  phase: DraftPhase;
  text: string;
  /** What the server said it would do (the model, where, what was sent and left out, and which [n] is which). */
  start: Start | null;
  error: { code: string; message: string } | null;
  check: AiDraftCheck | null;
  /** The folio and note it was made from: the check, and the [n] links, keep meaning these after the page changes. */
  folio: FolioFilter;
  purpose: string;
  startedAt: number;
  endedAt: number | null;
  tokensOut: number | null;
  /** You've changed what the model wrote. */
  edited: boolean;
  /** Copied or exported since its last change: nothing would be lost by leaving. */
  taken: boolean;
}

export function useDraft() {
  const [d, setD] = useState<DraftState | null>(null);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);

  const start = useCallback(async (folio: FolioFilter, purpose: string) => {
    ctl.current?.abort();
    const ac = new AbortController();
    ctl.current = ac;
    const note = purpose.trim();
    setD({ phase: 'waiting', text: '', start: null, error: null, check: null, folio, purpose: note, startedAt: Date.now(), endedAt: null, tokensOut: null, edited: false, taken: false });
    const patch = (p: Partial<DraftState> | ((x: DraftState) => Partial<DraftState>)) => {
      if (ctl.current !== ac) return; // a newer draft took over
      setD((x) => (x ? { ...x, ...(typeof p === 'function' ? p(x) : p) } : x));
    };
    try {
      const end = await streamDraft(
        { folio, ...(note ? { purpose: note } : {}) },
        (e) => {
          if (e.type === 'start') patch({ start: e });
          else patch((x) => ({ phase: 'streaming', text: x.text + e.text }));
        },
        ac.signal,
      );
      if (end.ok) patch({ phase: 'done', check: end.check, endedAt: Date.now(), tokensOut: end.tokensOut });
      else patch({ phase: end.error.code === 'cancelled' ? 'cancelled' : 'failed', error: end.error, endedAt: Date.now() });
    } catch (e) {
      if (ac.signal.aborted) patch({ phase: 'cancelled', endedAt: Date.now() });
      else patch({ phase: 'failed', endedAt: Date.now(), error: isApiError(e) ? { code: e.code, message: e.message } : { code: 'failed', message: 'The draft didn’t start.' } });
    }
  }, []);

  const cancel = useCallback(() => ctl.current?.abort(), []);
  const edit = useCallback((text: string) => setD((x) => (x ? { ...x, text, edited: true, taken: false } : x)), []);
  const taken = useCallback(() => setD((x) => (x ? { ...x, taken: true } : x)), []);
  const discard = useCallback(() => {
    ctl.current?.abort();
    ctl.current = null;
    setD(null);
  }, []);
  const setCheck = useCallback((check: AiDraftCheck) => setD((x) => (x ? { ...x, check } : x)), []);
  return { draft: d, start, cancel, edit, taken, discard, setCheck };
}

/** Check an edited (or cut-short) draft, a moment after you stop typing. */
export function useRecheck(d: DraftState | null, setCheck: (c: AiDraftCheck) => void) {
  const text = d?.text;
  // what you changed, or what arrived before a Cancel or a failure (a finished draft comes with its check)
  const edited = d?.edited || d?.phase === 'cancelled' || d?.phase === 'failed';
  const settled = d?.phase === 'done' || d?.phase === 'cancelled' || d?.phase === 'failed';
  const folio = d?.folio;
  const purpose = d?.purpose;
  useEffect(() => {
    if (!edited || !settled || !text || !folio) return;
    const ac = new AbortController();
    const t = setTimeout(() => {
      checkAiDraft({ draft: text, folio, ...(purpose ? { purpose } : {}) }, ac.signal).then(setCheck, () => {
        /* a failed re-check leaves the last flags up */
      });
    }, 700);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [text, edited, settled, folio, purpose, setCheck]);
}

/** `1:05`, from milliseconds. */
export const elapsed = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

/** The character offsets of a 1-based line in `text`, for selecting it. */
export function lineRange(text: string, line: number): [number, number] {
  const lines = text.split('\n');
  const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
  return [Math.min(start, text.length), Math.min(start + (lines[line - 1]?.length ?? 0), text.length)];
}
