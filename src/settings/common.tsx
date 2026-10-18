// Pieces the Settings tabs share: copying text (with a fallback where the clipboard API isn't available), a dark
// command slab with a Copy button, a load-error card, and the dashed "slot" a later feature fills.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy, RotateCw, Terminal } from 'lucide-react';
import { Btn, Hand, Kicker } from '../kit/index.ts';
import { isApiError } from '../api/client.ts';

/**
 * Put `text` on the clipboard. `navigator.clipboard` exists only in a secure context (https, or localhost); BragDoc
 * reached by a LAN name over plain http (Docker behind a proxy) has none, so fall back to selecting a hidden textarea
 * and the old copy command. False if neither worked: the caller says so, and the text stays on screen to copy by hand.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* denied: try the fallback */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.className = 'fixed -left-[9999px] top-0 opacity-0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

/** A Copy button that says "Copied" for a moment, or "Select and copy it by hand" if copying failed. */
/** `onFail`: copying didn't work, so the caller can make sure the text is on screen to copy by hand (an unmasked token). */
export function CopyButton({ text, label = 'Copy', what, onSlab, testId, onFail }: { text: string; label?: string; what: string; onSlab?: boolean; testId?: string; onFail?: () => void }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const click = async () => {
    const ok = await copyText(text);
    setState(ok ? 'copied' : 'failed');
    if (!ok) onFail?.();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), ok ? 1500 : 4000);
  };
  const shown = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy it by hand' : label;
  const icon = state === 'copied' ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />;
  if (onSlab)
    return (
      <button
        type="button"
        onClick={click}
        aria-label={`${label} ${what}`}
        data-testid={testId}
        className="flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11.5px] font-semibold text-slab-ink hover:bg-white/20"
      >
        {icon} <span aria-live="polite">{shown}</span>
      </button>
    );
  return (
    <Btn size="sm" onClick={click} aria-label={`${label} ${what}`} data-testid={testId}>
      {icon} <span aria-live="polite">{shown}</span>
    </Btn>
  );
}

/** A shell command on a dark slab, with what it's for above it and a Copy button. */
export function CommandSlab({ kicker, note, command, testId }: { kicker: string; note?: ReactNode; command: string; testId?: string }) {
  return (
    <div data-testid={testId}>
      <Kicker className="mb-1 flex items-center gap-1.5">
        <Terminal className="size-3.5" aria-hidden /> {kicker}
      </Kicker>
      <div className="flex items-start gap-2 rounded-2xl bg-slab p-3 pl-4">
        <pre className="m-0 min-w-0 flex-1 whitespace-pre-wrap break-all py-1 font-mono text-[12px] leading-relaxed text-slab-ink">{command}</pre>
        <CopyButton text={command} what={`the ${kicker} command`} onSlab />
      </div>
      {note && <div className="mt-1.5 text-[12.5px] leading-snug text-muted">{note}</div>}
    </div>
  );
}

/** What a tab shows when its data didn't load: the server's own sentence, and a retry. */
export function LoadError({ error, what, retry, testId = 'load-error' }: { error: unknown; what: string; retry: () => void; testId?: string }) {
  const unreachable = isApiError(error, 'network');
  return (
    <div role="alert" data-testid={testId} className="max-w-xl rounded-2xl bg-bad/10 p-4 text-[13.5px] leading-relaxed ring-1 ring-bad/30">
      <div className="font-grotesk text-[15px] font-extrabold text-bad">Couldn’t load {what}.</div>
      <div className="mt-1 text-muted">{unreachable ? 'BragDoc isn’t answering. Is it still running?' : error instanceof Error ? error.message : String(error)}</div>
      <Btn size="sm" className="mt-3" onClick={retry}>
        <RotateCw className="size-3.5" aria-hidden /> Try again
      </Btn>
    </div>
  );
}

/** A dashed placeholder for something a later piece of work adds here. */
export function Slot({ title, children, testId }: { title: string; children: ReactNode; testId: string }) {
  return (
    <div data-testid={testId} className="rounded-2xl border-[2.5px] border-dashed border-line p-4">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <div className="font-grotesk text-[15px] font-bold text-muted">{title}</div>
        <Hand className="text-[17px] text-faint">not in this build yet</Hand>
      </div>
      <div className="mt-1 text-[13px] leading-relaxed text-faint">{children}</div>
    </div>
  );
}

/** A tab's loading state: quiet, and the same height-ish as a card so the page doesn't jump much. */
export function Loading({ what }: { what: string }) {
  return (
    <div className="py-8 text-[13.5px] text-faint" role="status">
      Loading {what}…
    </div>
  );
}
