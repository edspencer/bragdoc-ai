// Toasts: one short message at a time at the bottom of the screen (above the mobile tabs), optionally with Undo.
// `const toast = useToast(); toast({ msg: 'Removed.', undo: () => restore(id) })`. A new toast replaces the
// current one. It goes after 3.5 s, or 6 s when there's something to undo, and stays while hovered or focused so
// Undo can't vanish under the pointer. Errors use tone 'bad'. Ported from the Scrapbook prototype's Toast, without
// the AI judge's "Tell the judge why?" reasons.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface ToastSpec {
  msg: ReactNode;
  undo?: () => void;
  tone?: 'ink' | 'bad';
}

const ToastContext = createContext<((t: ToastSpec) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastSpec & { id: number }) | null>(null);
  const [held, setHeld] = useState(false);
  const seq = useRef(0);
  const show = useCallback((t: ToastSpec) => setToast({ ...t, id: ++seq.current }), []);

  useEffect(() => {
    if (!toast || held) return;
    const timer = setTimeout(() => setToast(null), toast.undo ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [toast, held]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-8">
        {toast && (
          <div
            key={toast.id}
            data-testid="toast"
            role={toast.tone === 'bad' ? 'alert' : 'status'}
            onMouseEnter={() => setHeld(true)}
            onMouseLeave={() => setHeld(false)}
            onFocus={() => setHeld(true)}
            onBlur={() => setHeld(false)}
            className={`sb-toast pointer-events-auto flex max-w-xl flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-4 py-3 text-[13.5px] font-semibold shadow-2xl ${toast.tone === 'bad' ? 'bg-bad text-white' : 'bg-ink text-bg'}`}
          >
            <span>{toast.msg}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  // clear first: the undo may show a toast of its own ("Put back."), which must survive
                  setToast(null);
                  setHeld(false);
                  toast.undo!();
                }}
                className="rounded underline decoration-dotted underline-offset-2"
              >
                Undo
              </button>
            )}
            <button type="button" aria-label="Dismiss" onClick={() => (setToast(null), setHeld(false))} className="rounded px-1 opacity-60 hover:opacity-100">
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (t: ToastSpec) => void {
  const t = useContext(ToastContext);
  if (!t) throw new Error('useToast() outside <ToastProvider>');
  return t;
}
