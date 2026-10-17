// A picture full size over a dimmed page. A native <dialog> opened with showModal(), so the browser traps focus, makes
// the page behind inert and closes it on Esc; a click anywhere closes it too. Focus goes back to whatever opened it.
// Adapted from the Scrapbook prototype's shared/Lightbox.tsx.
import { useEffect, useRef } from 'react';

export function Lightbox({ src, alt, caption, onClose }: { src: string; alt: string; caption?: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const opener = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    return () => {
      if (d.open) d.close();
      opener?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={alt}
      // `close` is dispatched after the fact: under StrictMode's unmount-and-remount the dialog is open again by then,
      // and that close wasn't the user's
      onClose={() => !ref.current?.open && onClose()}
      onClick={onClose}
      className="m-0 h-full max-h-none w-full max-w-none cursor-zoom-out bg-black/80 p-6 text-center backdrop:bg-transparent"
    >
      <div className="flex h-full flex-col items-center justify-center">
        <img src={src} alt={alt} className="max-h-[80vh] max-w-[92vw] rounded-md shadow-2xl" />
        <div className="mt-4 text-sm text-white/80">{caption ?? alt}</div>
        <button type="button" onClick={onClose} className="mt-1 rounded text-xs text-white/60 underline decoration-dotted underline-offset-2 hover:text-white">
          Close (Esc)
        </button>
      </div>
    </dialog>
  );
}
