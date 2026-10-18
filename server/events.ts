// The in-process event bus and the SSE stream, adapted from Hallway's events.ts (itself Local Review's loop). Anything
// that changes what the web app shows emits a ServerEvent (shared/api.ts); GET /api/events pushes each one to every
// open tab as a `change` event, and the tab refetches what it names. Producers: config.yaml edits, the network log,
// and (from PR3/PR7) the store and its file watcher.
//
// The stream's Origin check isn't here: security.ts checks Origin on every request, this one included (SPEC R3).
import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { ServerEvent } from '../shared/api.js';

export type { ServerEvent };
type Listener = (e: ServerEvent) => void;

/** How long a burst of changes to one thing is gathered into one event. */
export const DEBOUNCE_MS = 150;
/** The SSE heartbeat: a `: ping` comment when nothing else was sent for this long (SPEC: 25 s). */
export const HEARTBEAT_MS = 25_000;

export class EventBus {
  private listeners = new Set<Listener>();
  private timers = new Map<string, { t: NodeJS.Timeout; e: ServerEvent; since: number }>();

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  /** How many subscribers (open tabs, mostly). */
  get size(): number {
    return this.listeners.size;
  }

  emit(e: ServerEvent): void {
    for (const l of this.listeners) {
      try {
        l(e);
      } catch {
        /* a broken listener mustn't stop the others */
      }
    }
  }

  /**
   * Debounce per key: emit `e` `ms` after the last call with this key, so a burst (an editor's write-rename-chmod, a
   * `git pull`, a page of GitHub requests) becomes one push. With `maxWaitMs`, a steady stream of calls (a long import,
   * an agent writing in a loop) still emits at least that often, rather than holding every push until it stops.
   */
  emitSoon(key: string, e: ServerEvent, ms = DEBOUNCE_MS, maxWaitMs = Infinity): void {
    const prev = this.timers.get(key);
    if (prev) clearTimeout(prev.t);
    const since = prev?.since ?? Date.now();
    const wait = Math.max(0, Math.min(ms, since + maxWaitMs - Date.now()));
    const t = setTimeout(() => {
      this.timers.delete(key);
      this.emit(e);
    }, wait);
    t.unref?.(); // a pending push mustn't hold a stopping server open
    this.timers.set(key, { t, e, since });
  }

  /** Run every pending debounced emit now (tests, shutdown). */
  flush(): void {
    for (const [key, { t, e }] of [...this.timers]) {
      clearTimeout(t);
      this.timers.delete(key);
      this.emit(e);
    }
  }
}

/**
 * `GET /api/events`: a `hello` event, then each ServerEvent as a `change` event with an incrementing id, and a
 * `: ping` comment every `heartbeatMs` of silence (which also lets a proxy know the stream is alive).
 */
export function sseHandler(bus: EventBus, heartbeatMs = HEARTBEAT_MS) {
  return (c: Context) => {
    // a proxy (or the Vite dev server) mustn't buffer the stream
    c.header('Cache-Control', 'no-store');
    c.header('X-Accel-Buffering', 'no');
    return streamSSE(c, async (stream) => {
      let id = 0;
      const queue: string[] = [];
      let wake: (() => void) | null = null;
      const unsub = bus.subscribe((e) => {
        queue.push(JSON.stringify(e));
        wake?.();
      });
      stream.onAbort(() => {
        unsub();
        wake?.();
      });
      await stream.writeSSE({ event: 'hello', data: JSON.stringify({ t: Date.now() }) });
      while (!stream.aborted) {
        while (queue.length) await stream.writeSSE({ event: 'change', data: queue.shift()!, id: String(++id) });
        let timer: NodeJS.Timeout | undefined;
        await new Promise<void>((res) => {
          wake = res;
          timer = setTimeout(res, heartbeatMs);
        });
        clearTimeout(timer); // woken early: don't leave a 25 s timer behind (it would hold a stopping server open)
        wake = null;
        if (!queue.length && !stream.aborted) await stream.write(': ping\n\n');
      }
      unsub();
    });
  };
}
