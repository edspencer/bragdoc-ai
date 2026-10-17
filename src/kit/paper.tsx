// Paper: the things pinned to the board. Taped cards and panels, photo prints, PDF pages, sticky notes, rubber stamps
// and the receipt roll. Ported from the Scrapbook prototype (ui.tsx, Board.tsx, Settings.tsx), with its data lookups
// replaced by plain props.
import { forwardRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { safeColour, tilt } from '../lib/colour.ts';
import { Lightbox } from './Lightbox.tsx';

/** A strip of washi tape. Position it with classes (`-top-2.5 left-1/2 -translate-x-1/2`); its parent is relative. */
export function Tape({ color, className = '', style }: { color: string; className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={`sb-tape ${className}`} style={{ background: safeColour(color), ...style }} />;
}

const TAPE_AT = {
  center: '-top-2.5 left-1/2 -translate-x-1/2',
  left: '-top-2.5 left-8 w-16',
  right: '-top-2.5 right-8 w-14',
} as const;

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  children: ReactNode;
  /** Tape colour (a project's colour); no tape if omitted. */
  tape?: string;
  tapeAt?: keyof typeof TAPE_AT;
  /** Rotate by a stable few tenths of a degree, from this id (see `tilt`). */
  tiltId?: string;
  /** Highlight a just-added card: a tomato ring and a pop-in. */
  fresh?: boolean;
  as?: 'article' | 'section' | 'div';
  'data-testid'?: string;
}

/**
 * A card on the board: card stock, a soft shadow, optional project-colour tape. Other props (`id`, `onClick`, aria
 * attributes, a ref) go to the element.
 */
export const Card = forwardRef<HTMLElement, CardProps>(function Card({ children, tape, tapeAt = 'center', tiltId, fresh, as: Tag = 'article', className = '', style, ...rest }, ref) {
  return (
    <Tag
      ref={ref as never}
      {...rest}
      className={`sb-card relative rounded-2xl p-4 ${fresh ? 'sb-pop-in ring-2 ring-accent' : ''} ${className}`}
      style={tiltId ? { rotate: `${tilt(tiltId, 0.4)}deg`, ...style } : style}
    >
      {tape && <Tape color={tape} className={TAPE_AT[tapeAt]} />}
      {children}
    </Tag>
  );
});

/** A bigger sheet for forms and settings: rounder, roomier, tape on the left. */
export function Panel({ children, tape, className = '' }: { children: ReactNode; tape?: string; className?: string }) {
  return (
    <section className={`sb-card relative rounded-3xl p-5 sm:p-6 ${className}`}>
      {tape && <Tape color={tape} className={TAPE_AT.left} />}
      {children}
    </section>
  );
}

/**
 * Cards in 1, 2 or 3 columns by width, each kept whole (the board's masonry). Cards fill each column top to bottom.
 * They're blocks, not the prototype's inline-blocks: Chrome won't balance inline-blocks across columns, and put a
 * week of two cards both in the first column.
 */
export function Masonry({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`gap-6 sm:columns-2 lg:columns-3 [&>*]:mb-7 [&>*]:block [&>*]:w-full [&>*]:break-inside-avoid ${className}`}>{children}</div>;
}

export interface PrintProps {
  src: string;
  alt: string;
  /** Handwritten under the picture; the alt text if omitted. */
  caption?: string;
  /** Stable tilt; omit for a straight print. */
  tiltId?: string;
  /** No caption and less tilt, for small spaces. */
  small?: boolean;
  /** The full-size picture for the lightbox, when `src` is a thumbnail. */
  full?: string;
}

/**
 * A photo print: a screenshot or image on cream stock with a handwritten caption. In the dark theme the picture is
 * dimmed and warmed so a white screenshot doesn't glare. Click to open it full size.
 */
export function Print({ src, alt, caption, tiltId, small, full }: PrintProps) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  // a damaged or missing picture: say so on the print rather than show the browser's broken-image icon
  if (broken)
    return (
      <div role="img" aria-label={`${alt} (it can't be shown)`} className="sb-print block w-full p-2 pb-1" style={tiltId ? { rotate: `${tilt(tiltId, small ? 0.8 : 1.6)}deg` } : undefined}>
        <div className="flex aspect-[4/3] max-h-40 w-full items-center justify-center bg-[#e6e0d4] px-3 text-center text-[12px] font-semibold text-[#5f584d]">This picture can&apos;t be shown</div>
        {!small && <span className="block px-1 pb-1 pt-1.5 text-left font-hand text-[17px] leading-tight text-print-ink">{caption ?? alt}</span>}
      </div>
    );
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // the print sits inside cards that may be clickable themselves: opening it is all this click does
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Open ${alt} full size`}
        className="sb-print block w-full cursor-zoom-in p-2 pb-1 transition hover:rotate-0 hover:scale-[1.01]"
        // `rotate`, not `transform`, so Tailwind's hover:rotate-0 (which sets `rotate`) can straighten it
        style={tiltId ? { rotate: `${tilt(tiltId, small ? 0.8 : 1.6)}deg` } : undefined}
      >
        <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setBroken(true)} className="block w-full" />
        {!small && <span className="block px-1 pb-1 pt-1.5 text-left font-hand text-[17px] leading-tight text-print-ink">{caption ?? alt}</span>}
      </button>
      {open && <Lightbox src={full ?? src} alt={alt} caption={caption} onClose={() => setOpen(false)} />}
    </>
  );
}

/** A drawn first page of a PDF (a thumbnail stand-in): its title and grey lines of "text". */
export function PdfPage({ title, className = '' }: { title: string; className?: string }) {
  return (
    <div aria-hidden className={`sb-print relative overflow-hidden rounded-sm p-3 ${className}`}>
      <div className="line-clamp-3 text-[9px] font-bold leading-tight text-[#1d1a17]">{title}</div>
      <div className="mt-2 space-y-[4px]">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="h-[3px] rounded bg-[#e6e0d4]" style={{ width: `${62 + ((i * 41) % 36)}%` }} />
        ))}
      </div>
      <span className="absolute bottom-2 right-2 rounded bg-[#ef5a3c] px-1 text-[8px] font-bold text-white">PDF</span>
    </div>
  );
}

/** A sticky note. Deep marigold in the dark theme. */
export function Sticky({ children, rotate = -0.8, className = '' }: { children: ReactNode; rotate?: number; className?: string }) {
  return (
    <div className={`sb-sticky relative px-5 py-4 ${className}`} style={{ transform: `rotate(${rotate}deg)` }}>
      {children}
    </div>
  );
}

/** A quote on a sticky note, handwritten, with who said it and where. */
export function StickyQuote({ text, from, where, rotate = -0.6, big }: { text: string; from?: string; where?: string; rotate?: number; big?: boolean }) {
  const by = [from, where].filter(Boolean).join(' · ');
  return (
    <figure className="sb-sticky relative m-0 px-4 pb-3 pt-4" style={{ transform: `rotate(${rotate}deg)` }}>
      <blockquote className={`m-0 font-hand leading-[1.1] ${big ? 'text-[24px]' : 'text-[22px]'}`}>“{text}”</blockquote>
      {by && <figcaption className="mt-1.5 text-[11px] font-semibold text-sticky-sub">{by}</figcaption>}
    </figure>
  );
}

/**
 * A rubber stamp: a short uppercase word in a coloured border (an allow-list host, "LOCAL", "DISMISSED"). Not for
 * AI confidence (there's no AI in v0.1), and never a self-asserted "VERIFIED" (SPEC R14).
 */
export function Stamp({ children, color = 'var(--accent)', rotate = 4, className = '' }: { children: ReactNode; color?: string; rotate?: number; className?: string }) {
  return (
    <span
      className={`sb-stamp inline-block rounded-md border-[2.5px] px-2 py-0.5 font-grotesk text-[12.5px] font-extrabold uppercase tracking-wide ${className}`}
      style={{ borderColor: color, color, transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  );
}

/** A till receipt with torn zig-zag edges, for lists of facts (Settings → Network activity). Monospace inside. */
export function Receipt({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`sb-receipt mx-auto my-3 max-w-xl px-6 py-6 font-mono text-[12.5px] leading-relaxed ${className}`}>{children}</div>;
}

/** A ruled index card / notebook page, with the red margin. Text inside should sit on 28px lines. */
export function Ruled({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`sb-ruled sb-card relative rounded-xl py-3 pl-[80px] pr-5 text-[15px] leading-[28px] ${className}`}>{children}</div>;
}
