// The welcome steps (SPEC R10), in order, with their tape colours: the Welcome page's paper tabs, and Settings → Data's
// links to run one again.
export const STEPS = [
  { id: 'you', label: 'About you', tape: '#ef5a3c' },
  { id: 'sources', label: 'Where wins come from', tape: '#3b6cf6' },
  { id: 'code', label: 'Your code', tape: '#2fb37e' },
] as const;
export type StepId = (typeof STEPS)[number]['id'];

/** Set (sessionStorage) when you leave Welcome in a tab, so the board never bounces you back to it there. */
export const WELCOME_LEFT = 'bragdoc.welcome.left';
