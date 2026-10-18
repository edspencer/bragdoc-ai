// "Tidy this up" on the board (SPEC R23, D78): whether to offer it, the call (with Cancel), and how an accepted field
// lands in the composer or the edit drawer. A suggestion never saves anything: it changes what's in front of you, and
// you press Pin it or Save as always (SPEC principle 6).
//
// It shows only while AI and Tidy are both on (SPEC R26): with either off there's no button, no sheet, nothing. Turned
// on but not ready (no model chosen, a connection without consent), the button shows disabled with the reason.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AiStatus, AiTidyRequest, AiTidyResponse } from '../../shared/api.ts';
import { HOST_CLASS_LABEL } from '../../shared/ai/hosts.ts';
import { NETWORK_ERROR, api, isApiError } from '../api/client.ts';
import { todayIso } from '../lib/dates.ts';

export const tidyText = (body: AiTidyRequest, signal?: AbortSignal) => api.post<AiTidyResponse>('/api/ai/tidy', { ...body, today: todayIso() }, { signal });

export interface TidyAvailability {
  /** AI and Tidy are both on: offer it at all. */
  show: boolean;
  /** It could run now. */
  ready: boolean;
  /** Why not, in words, when it's shown but not ready. */
  why: string | null;
  /** "qwen3.5:4b on this computer", for the thinking line. */
  label: string | null;
}

const OFF: TidyAvailability = { show: false, ready: false, why: null, label: null };

/** From GET /api/ai: nothing shows until the server says AI and Tidy are on. */
export function tidyAvailability(s: AiStatus | undefined): TidyAvailability {
  if (!s?.enabled || !s.features.tidy.enabled) return OFF;
  const r = s.readiness.tidy;
  const label = r.slot ? `${r.slot.model} on ${r.where ? HOST_CLASS_LABEL[r.where] : r.slot.connection}` : null;
  return { show: true, ready: r.ready, why: r.ready ? null : (r.message ?? 'Tidy isn’t ready (Settings → AI).'), label };
}

/** Whether to offer Tidy, live: the same query (and key) as Settings → AI, so a change there shows here at once. */
export function useTidyAvailability(): TidyAvailability {
  const q = useQuery({ queryKey: ['ai'], queryFn: ({ signal }) => api.get<AiStatus>('/api/ai', { signal }) });
  return tidyAvailability(q.data);
}

/** What a suggestion offers, one key per Use button. */
export type TidyKey = 'title' | 'summary' | 'body' | 'dates' | 'impact' | 'projects';

export type TidyPhase =
  | { kind: 'idle' }
  | { kind: 'thinking'; label: string | null }
  | { kind: 'error'; message: string }
  | { kind: 'done'; r: AiTidyResponse; used: TidyKey[] };

/** The keys a suggestion has something for, in the order Use all applies them. */
export function offered(r: AiTidyResponse): TidyKey[] {
  const s = r.suggestion;
  if (s.notAnAchievement) return [];
  return (
    [
      ['body', !!s.body],
      ['title', !!s.title],
      ['summary', !!s.summary],
      ['dates', !!s.happenedAt],
      ['impact', s.impact !== null],
      ['projects', s.suggestedProjects.length > 0],
    ] as const
  )
    .filter(([, has]) => has)
    .map(([k]) => k);
}

/** A failed tidy, in words; null for one you cancelled. Your text is never touched by a failure. */
export function tidyError(e: unknown): string | null {
  if (isApiError(e, 'cancelled') || (e instanceof DOMException && e.name === 'AbortError')) return null;
  if (isApiError(e, NETWORK_ERROR)) return 'Couldn’t tidy it: BragDoc isn’t answering. Your text is as you left it.';
  if (isApiError(e, 'ai_off')) return `${e.message.replace(/\.$/, '')}. Nothing was changed.`;
  if (isApiError(e, 'too_long') || isApiError(e, 'empty') || isApiError(e, 'not_read_yet') || isApiError(e, 'not_readable')) return e.message;
  if (isApiError(e)) return `Couldn’t tidy it: ${e.message} Your text is as you left it.`;
  return 'Couldn’t tidy it. Your text is as you left it.';
}

/** One tidy at a time: start it, cancel it (the server cancels the model call), and track which fields were used. */
export function useTidy() {
  const [phase, setPhase] = useState<TidyPhase>({ kind: 'idle' });
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);

  const run = useCallback(async (body: AiTidyRequest, label: string | null) => {
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setPhase({ kind: 'thinking', label });
    try {
      const r = await tidyText(body, c.signal);
      if (!c.signal.aborted) setPhase({ kind: 'done', r, used: [] });
    } catch (e) {
      if (c.signal.aborted) return;
      const message = tidyError(e);
      setPhase(message ? { kind: 'error', message } : { kind: 'idle' });
    } finally {
      if (ctl.current === c) ctl.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    ctl.current?.abort();
    ctl.current = null;
    setPhase({ kind: 'idle' });
  }, []);

  const markUsed = useCallback((keys: TidyKey[]) => setPhase((p) => (p.kind === 'done' ? { ...p, used: [...new Set([...p.used, ...keys])] } : p)), []);

  return { phase, run, cancel, close: cancel, markUsed };
}

export type Tidy = ReturnType<typeof useTidy>;

// ---------------------------------------------------------------- applying to the composer's text (D78)

/**
 * The composer's text is "the first line is the title, the rest the notes". Using a suggested title or body keeps
 * what you wrote (D78): a title goes in as a new first line, with your whole text moved down into the notes under it;
 * using another title later replaces only a first line that is still the title Tidy put there (`previous`), never one
 * you typed. A suggested body goes under the title, above your own words.
 */
export function applyTitle(text: string, title: string, previous: string | null): string {
  if (!text.trim()) return title;
  const nl = text.indexOf('\n');
  const first = nl < 0 ? text : text.slice(0, nl);
  if (previous !== null && first === previous) return nl < 0 ? title : `${title}${text.slice(nl)}`;
  return `${title}\n${text}`;
}

export function applyBody(text: string, body: string): string {
  const nl = text.indexOf('\n');
  if (nl < 0) return text.trim() ? `${text}\n${body}` : `\n${body}`;
  const rest = text.slice(nl + 1);
  return `${text.slice(0, nl)}\n${body}${rest.trim() ? `\n\n${rest}` : ''}`;
}

/** A field's text split into runs, with the words not in your text marked. */
export function markUngrounded(text: string, words: string[] | undefined): { text: string; flagged: boolean }[] {
  const ws = (words ?? []).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!ws.length) return [{ text, flagged: false }];
  const re = new RegExp(`(${ws.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text
    .split(re)
    .filter((t) => t !== '')
    .map((t) => ({ text: t, flagged: ws.some((w) => w.toLowerCase() === t.toLowerCase()) }));
}
