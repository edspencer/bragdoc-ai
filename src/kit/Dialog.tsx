// A modal sheet for forms (new/edit project, company, a delete confirmation). Built on the native <dialog> with
// showModal(): the browser traps focus, makes the page behind inert, and closes it on Escape (which we turn into
// `onClose`, so the owner decides). A click on the backdrop closes it too. No portal or focus-trap library needed.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Tape } from './paper.tsx';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** A line under the title. */
  sub?: ReactNode;
  /** Tape across the top in this colour (a project's). */
  tape?: string;
  children: ReactNode;
  /** The buttons along the bottom. */
  footer?: ReactNode;
  /** `sm` for confirmations. */
  size?: 'sm' | 'md';
  'data-testid'?: string;
}

export function Dialog({ open, onClose, title, sub, tape, children, footer, size = 'md', 'data-testid': testId }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-testid={testId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // the <dialog> itself is only the target when the click lands on its backdrop
        if (e.target === ref.current) onClose();
      }}
      className={`sb-card m-auto max-h-[min(92vh,900px)] w-[calc(100vw-1.5rem)] overflow-visible rounded-3xl bg-surface p-0 text-ink backdrop:bg-[rgba(20,16,12,.45)] backdrop:backdrop-blur-[2px] ${size === 'sm' ? 'max-w-md' : 'max-w-2xl'}`}
    >
      {open && (
        <div className="relative flex max-h-[min(92vh,900px)] flex-col">
          {tape && <Tape color={tape} className="-top-2.5 left-10 w-20" />}
          <div className="flex items-start gap-3 px-5 pt-6 sm:px-7">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="m-0 font-grotesk text-[24px] font-extrabold leading-tight tracking-tight break-words">
                {title}
              </h2>
              {sub && <p className="m-0 mt-1 text-[13.5px] leading-relaxed text-muted">{sub}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 rounded-full p-2 text-faint hover:bg-sunk hover:text-ink">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-4 sm:px-7">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-7">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
