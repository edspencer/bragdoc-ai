// Controls: buttons, the paper switch, form fields, filter chips, status dots and the project colour picker. Ported
// from the Scrapbook prototype (ui.tsx Btn, Switch, Dot, Field, inputCls; Found.tsx FilterChip; Projects.tsx
// ColourPicker). Every control is a real <button>/<input>/<a>, so keyboard focus and screen readers come for free;
// the focus ring is the global :focus-visible rule in styles.css.
import { forwardRef, useId, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { createLink } from '@tanstack/react-router';
import { Check, Palette } from 'lucide-react';
import { PROJECT_SWATCHES, inkOn, safeColour } from '../lib/colour.ts';

export type BtnKind = 'go' | 'accent' | 'paper' | 'ghost' | 'ink' | 'danger';

const BTN_KIND: Record<BtnKind, string> = {
  go: 'bg-good text-white shadow-[0_3px_0_var(--good-shadow)] active:translate-y-0.5 active:shadow-none dark:text-[#10241a]',
  accent: 'bg-accent text-accent-ink shadow-[0_3px_0_var(--accent-shadow)] active:translate-y-0.5 active:shadow-none',
  paper: 'bg-surface text-ink ring-2 ring-line hover:ring-faint/60',
  ink: 'bg-ink text-bg',
  ghost: 'text-muted hover:text-ink',
  danger: 'bg-surface text-bad ring-2 ring-bad/40 hover:ring-bad',
};

/** The classes of a button of this kind, for things that aren't <Btn> (a <label> around a file input, say). */
export function btnClass(kind: BtnKind = 'paper', size: 'md' | 'sm' = 'md'): string {
  const s = size === 'sm' ? 'px-3 py-1.5 text-[12.5px]' : 'px-4 py-2 text-[14px]';
  return `inline-flex items-center justify-center gap-2 rounded-full font-grotesk font-bold no-underline transition disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 ${s} ${BTN_KIND[kind]}`;
}

export interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: BtnKind;
  size?: 'md' | 'sm';
}

/** A rounded button. `go` (green) confirms, `accent` (tomato) is the page's main action, `paper` is everything else. */
export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn({ kind = 'paper', size = 'md', className = '', type = 'button', ...rest }, ref) {
  return <button ref={ref} type={type} className={`${btnClass(kind, size)} ${className}`} {...rest} />;
});

interface BtnAnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  kind?: BtnKind;
  size?: 'md' | 'sm';
}
const BtnAnchor = forwardRef<HTMLAnchorElement, BtnAnchorProps>(function BtnAnchor({ kind = 'paper', size = 'md', className = '', ...rest }, ref) {
  return <a ref={ref} className={`${btnClass(kind, size)} ${className}`} {...rest} />;
});

/** A router link that looks like a <Btn>: `<LinkBtn to="/settings/$tab" params={{ tab: 'sources' }} kind="accent">`. */
export const LinkBtn = createLink(BtnAnchor);

/** An on/off switch drawn like a little paper slider. `label` is what it switches, for screen readers. */
export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`sb-switch relative inline-flex h-7 w-12 shrink-0 items-center rounded-full ring-2 disabled:cursor-not-allowed disabled:opacity-40 ${on ? 'bg-good ring-good' : 'bg-sunk ring-line'}`}
    >
      <span className={`absolute left-0.5 size-6 rounded-full bg-surface shadow-[0_2px_4px_rgba(0,0,0,.25)] ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

export type Tone = 'good' | 'bad' | 'warn' | 'off';

/** A status dot: good (with a soft halo), bad, warn, or off. */
export function Dot({ tone, label }: { tone: Tone; label?: string }) {
  const c = { good: 'bg-good', bad: 'bg-bad', warn: 'bg-warn', off: 'bg-faint/50' }[tone];
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`inline-block size-2 shrink-0 rounded-full ${c} ${tone === 'good' ? 'shadow-[0_0_0_3px_color-mix(in_oklab,var(--good)_25%,transparent)]' : ''}`}
    />
  );
}

/** The look of every text box: sunk paper, a tomato ring on focus. */
export const inputCls =
  'block w-full rounded-xl bg-sunk px-3.5 py-2.5 text-[15px] text-ink outline-none ring-2 ring-transparent placeholder:text-faint focus-visible:ring-accent/60 aria-[invalid=true]:ring-bad/70 disabled:opacity-50';

/** A labelled form field: the label over the control, a hint or an error under it. */
export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-semibold text-muted">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? (
        <span role="alert" className="mt-1 block text-[12px] font-semibold text-bad">
          {error}
        </span>
      ) : (
        hint && <span className="mt-1 block text-[12px] text-faint">{hint}</span>
      )}
    </label>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className = '', ...rest }, ref) {
  return <input ref={ref} className={`${inputCls} ${className}`} {...rest} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className = '', ...rest }, ref) {
  return <textarea ref={ref} className={`${inputCls} min-h-24 resize-y ${className}`} {...rest} />;
});

/** A toggle chip in a filter row: label, count, and an optional colour dot. */
export function FilterChip({ on, onClick, label, count, color }: { on: boolean; onClick: () => void; label: string; count?: number; color?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${on ? 'bg-ink text-bg' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'}`}
    >
      {color && <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />}
      {label}
      {count !== undefined && <span className={`rounded-full px-1.5 text-[11px] ${on ? 'bg-bg/20' : 'bg-sunk'}`}>{count}</span>}
    </button>
  );
}

/** A small count bubble (the Found badge). */
export function CountBadge({ n, className = 'bg-warn text-white' }: { n: number; className?: string }) {
  return <span className={`rounded-full px-1.5 text-[11px] font-bold ${className}`}>{n > 99 ? '99+' : n}</span>;
}

/**
 * A project's tape colour: twelve swatches, plus "Any colour" (the native picker). Any colour works: text on it is
 * picked by luminance wherever it's shown (`inkOn`).
 */
export function ColourPicker({ value, onChange, label = 'Tape colour' }: { value: string; onChange: (hex: string) => void; label?: string }) {
  const id = useId();
  const cur = safeColour(value).toLowerCase();
  return (
    <div role="group" aria-labelledby={id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface/70 p-2.5 pr-4 ring-1 ring-line sm:w-fit">
      <span id={id} className="flex items-center gap-1.5 px-1.5 text-[12px] font-bold uppercase tracking-wider text-faint">
        <Palette aria-hidden className="size-4" /> {label}
      </span>
      {PROJECT_SWATCHES.map((s) => (
        <button
          key={s}
          type="button"
          aria-label={`Use ${s}`}
          aria-pressed={cur === s}
          onClick={() => onChange(s)}
          className="flex size-7 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-surface transition hover:scale-110"
          style={{ background: s, ['--tw-ring-color' as string]: cur === s ? s : 'transparent' }}
        >
          {cur === s && <Check aria-hidden className="size-3.5" style={{ color: inkOn(s) }} />}
        </button>
      ))}
      <label className="ml-1 flex cursor-pointer items-center gap-2 rounded-full bg-sunk py-1 pl-1 pr-3 text-[12.5px] font-semibold text-muted focus-within:outline focus-within:outline-[2.5px] focus-within:outline-offset-2 focus-within:outline-accent">
        <span className="sb-rainbow relative size-6 overflow-hidden rounded-full ring-1 ring-line">
          <input type="color" value={cur} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Any colour" />
        </span>
        Any colour
        <span className="font-mono text-[11px] text-faint">{cur}</span>
      </label>
    </div>
  );
}
