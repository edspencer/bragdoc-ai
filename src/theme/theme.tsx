// Light / system / dark (SPEC R10). The choice is kept in localStorage (it's a preference of this browser, not data),
// and the resolved theme is the `dark` class on <html>, where the tokens in styles.css live. public/theme-init.js
// applies it before the first paint; this provider takes over from there and follows the system while the choice is
// "system". Adapted from Hallway's src/theme/theme.ts (its pre-paint script is inline; ours can't be, under the CSP).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemePref = 'light' | 'system' | 'dark';

/** Shared with public/theme-init.js: change both together (test/web.test.ts checks). */
export const THEME_STORAGE_KEY = 'bragdoc.theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage blocked (some private modes): just no memory */
  }
  return 'system';
}

export function resolveDark(pref: ThemePref, systemDark: boolean): boolean {
  return pref === 'dark' || (pref === 'system' && systemDark);
}

interface ThemeState {
  /** What the user chose. */
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  /** What's showing now. */
  dark: boolean;
}

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(readThemePref);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Another tab changed it: follow along.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === THEME_STORAGE_KEY && setPrefState(readThemePref());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const dark = resolveDark(pref, systemDark);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const setPref = useCallback((p: ThemePref) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, p);
    } catch {
      /* no memory, but it still applies to this visit */
    }
    setPrefState(p);
  }, []);

  const value = useMemo(() => ({ pref, setPref, dark }), [pref, setPref, dark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('useTheme() outside <ThemeProvider>');
  return t;
}
