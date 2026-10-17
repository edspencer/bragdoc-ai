// The default port, on its own so vite.config.ts can import it without loading the rest of the server.
// 2724 spells BRAG on a phone keypad (D6). The CLI help, the startup line and `npm run dev` all derive from it.
export const DEFAULT_PORT = 2724;

/** A port number from a flag or $PORT: an integer 0–65535 (0 lets the OS pick, for tests), else null. */
export function parsePort(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return n >= 0 && n <= 65535 ? n : null;
}
