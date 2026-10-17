// Light · system · dark, as three icon buttons in a glass pill (Scrapbook prototype). A radio group: one is always
// chosen, and the arrow keys move between them, as for any radio group.
import { useRef, type KeyboardEvent } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePref } from '../theme/theme.tsx';

const OPTIONS: { id: ThemePref; icon: typeof Sun; label: string }[] = [
  { id: 'light', icon: Sun, label: 'Light' },
  { id: 'system', icon: Monitor, label: 'Match system' },
  { id: 'dark', icon: Moon, label: 'Dark' },
];

export function ThemeToggle() {
  const { pref, setPref } = useTheme();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + OPTIONS.length) % OPTIONS.length;
    setPref(OPTIONS[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Theme" data-testid="theme-toggle" className="sb-glass flex items-center rounded-full p-1 shadow-[0_4px_14px_-8px_rgba(0,0,0,.35)]">
      {OPTIONS.map((o, i) => (
        <button
          key={o.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={pref === o.id}
          aria-label={o.label}
          title={o.label}
          tabIndex={pref === o.id ? 0 : -1}
          onClick={() => setPref(o.id)}
          onKeyDown={(e) => onKey(e, i)}
          className={`flex size-7 items-center justify-center rounded-full transition ${pref === o.id ? 'bg-ink text-bg' : 'text-muted hover:text-ink'}`}
        >
          <o.icon aria-hidden className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
