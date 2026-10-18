// The four places in the app, in the order the header and the mobile tabs show them, each with its pill colour (from
// the Scrapbook prototype). Text on a pill is black or white by the colour's luminance (inkOn).
export const NAV = [
  { to: '/', label: 'Board', color: '#ef5a3c' },
  { to: '/found', label: 'Found', color: '#e9961a' },
  { to: '/projects', label: 'Projects', color: '#3b6cf6' },
  { to: '/folio', label: 'Folio', color: '#2fb37e' },
] as const;

export type NavTo = (typeof NAV)[number]['to'];

/** Settings' notebook tabs (SPEC R13), with their edge colours. `/settings` opens the first. */
export const SETTINGS_TABS = [
  { id: 'sources', label: 'Sources', color: '#7a3e7f' },
  // v0.2 (SPEC R26): after Sources, and there whether AI is on or off: it's where you turn it on
  { id: 'ai', label: 'AI', color: '#2fb37e' },
  { id: 'network', label: 'Network activity', color: '#3b6cf6' },
  { id: 'data', label: 'Data', color: '#e9961a' },
  { id: 'about', label: 'About & verify', color: '#ef5a3c' },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]['id'];

export function isSettingsTab(s: string): s is SettingsTab {
  return SETTINGS_TABS.some((t) => t.id === s);
}
