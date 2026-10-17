// The BragDoc mark (a tomato tile with a "b", tilted like something pinned in a hurry) and the wordmark. The tile is
// the same drawing as brand/mark.svg, which the favicon and icons are generated from.

export function Mark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={`${className} rotate-[-6deg] drop-shadow-[0_3px_0_var(--accent-shadow)]`}>
      <rect width="32" height="32" rx="7" fill="var(--accent)" />
      <path fill="var(--accent-ink)" d={MARK_B} />
    </svg>
  );
}

/**
 * The "b", on a 32-unit tile: a stem and a bowl drawn clockwise, the counter anticlockwise (so the default nonzero
 * fill punches it out). Keep in step with brand/mark.svg.
 */
export const MARK_B = 'M9 6H13.6V25.5H9Z M17 12.5A6.5 6.5 0 1 1 17 25.5A6.5 6.5 0 1 1 17 12.5Z M17 15.9A3.1 3.1 0 1 0 17 22.1A3.1 3.1 0 1 0 17 15.9Z';

export function Wordmark() {
  return <span className="font-grotesk text-[24px] font-extrabold tracking-tight text-ink">bragdoc</span>;
}
