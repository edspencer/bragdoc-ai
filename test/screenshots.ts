// Synthetic screenshots for the OCR and rules tests: chat messages drawn the way Slack draws them (the shape of the
// design prototype's scripts/gen-evidence.mjs), plus a dashboard, a code editor, a calendar invite, an email and a
// blank image. Rendered SVG → PNG with resvg and the fonts in test/fixtures/screenshots/fonts/ (Hallway's, SIL OFL)
// only, never the system's, so every machine draws the same pixels. Every person, company and channel is made up.
//
// Two kinds of fixture:
// - CASES: hand-made screenshots, each with the outcome the rules should give (and why).
// - datasetShot(): any of the Found spike's 218 labelled messages (test/fixtures/screenshots/messages.json) drawn as
//   a screenshot of its channel (with its thread above it), plus `text`, what a perfect OCR would read.
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import type { RulesProfile } from '../shared/rules/screenshot.ts';
import { ROOT } from './fixture.ts';

const FIXTURES = path.join(ROOT, 'test', 'fixtures', 'screenshots');
const FONTS = ['Inter-Medium.ttf', 'JetBrainsMono-Regular.ttf'].map((f) => path.join(FIXTURES, 'fonts', f));

/** The made-up person every fixture is about (the spike's profile). */
export const ALEX: RulesProfile = { name: 'Alex Marlowe', aliases: ['Alex', 'AM', '@alex.m', 'Marlowe'], notMe: ['Alex P', 'Alexandra'] };

export function png(svg: string, zoom = 1): Buffer {
  return new Resvg(svg, {
    fitTo: { mode: 'zoom', value: zoom },
    font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Inter', sansSerifFamily: 'Inter', monospaceFamily: 'JetBrains Mono' },
  })
    .render()
    .asPng();
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/)) {
    if ((cur + ' ' + w).trim().length > max && cur) {
      lines.push(cur.trim());
      cur = w;
    } else cur += ' ' + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

// ---- chat ----------------------------------------------------------------------------------------------------------

export interface ChatMessage {
  author: string;
  time: string;
  text: string;
  /** Emoji and counts: the counts are what OCR sees. */
  reactions?: [string, number][];
  /** "7 replies", under the message. */
  replies?: string;
}

export interface Chat {
  /** `# channel`, a person's name for a DM, or `Thread` (with `channel` under it). */
  title: string;
  subtitle?: string;
  messages: ChatMessage[];
  dark?: boolean;
  width?: number;
}

const AVATAR = ['#2b8a6e', '#7a4fd1', '#c2552c', '#d1477a', '#1264a3', '#8a6d1d'];
const initialsOf = (n: string) =>
  n
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** A Slack-style window, and the text a perfect OCR would read from it. */
export function chat({ title, subtitle, messages, dark = false, width = 760 }: Chat): { svg: string; text: string } {
  const ink = dark ? '#d1d2d3' : '#1d1c1d';
  const muted = dark ? '#9a9b9e' : '#616061';
  const link = dark ? '#5aa9e6' : '#1264a3';
  const bg = dark ? '#1a1d21' : '#ffffff';
  const chars = Math.floor((width - 120) / 8);
  const out: string[] = [];
  const text: string[] = [title];
  let y = 31;
  out.push(`<text x="24" y="${y}" font-size="17" font-weight="800" fill="${ink}">${esc(title)}</text>`);
  if (subtitle) {
    out.push(`<text x="${24 + title.length * 10 + 12}" y="${y}" font-size="13" fill="${muted}">${esc(subtitle)}</text>`);
    text[0] += ` ${subtitle}`;
  }
  out.push(`<line x1="0" y1="48" x2="${width}" y2="48" stroke="${dark ? '#35373b' : '#e8e8e8'}"/>`);
  y = 64;
  messages.forEach((m, i) => {
    const colour = AVATAR[[...m.author].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];
    out.push(`<rect x="24" y="${y + 8}" width="40" height="40" rx="6" fill="${colour}"/>`);
    out.push(`<text x="44" y="${y + 34}" text-anchor="middle" font-size="15" font-weight="700" fill="#fff">${esc(initialsOf(m.author))}</text>`);
    out.push(`<text x="80" y="${y + 22}" font-size="15" font-weight="900" fill="${ink}">${esc(m.author)}</text>`);
    out.push(`<text x="${80 + m.author.length * 8.4 + 10}" y="${y + 22}" font-size="12" fill="${muted}">${esc(m.time)}</text>`);
    text.push(`${m.author} ${m.time}`);
    y += 22;
    for (const line of wrap(m.text, chars)) {
      y += 22;
      // mentions in blue, as Slack draws them
      const parts = line.split(/(@[A-Z][\w.]*(?: [A-Z][\w]+)?)/);
      const spans = parts.map((p, j) => (j % 2 ? `<tspan fill="${link}">${esc(p)}</tspan>` : `<tspan>${esc(p)}</tspan>`)).join('');
      out.push(`<text x="80" y="${y}" font-size="15" fill="${ink}">${spans}</text>`);
      text.push(line);
    }
    if (m.reactions?.length) {
      y += 12;
      let x = 80;
      for (const [e, n] of m.reactions) {
        out.push(`<rect x="${x}" y="${y}" width="50" height="24" rx="12" fill="${dark ? '#2c2d30' : '#f6f6f6'}" stroke="${dark ? '#45464a' : '#e0e0e0'}"/>`);
        out.push(`<text x="${x + 9}" y="${y + 17}" font-size="13">${esc(e)}</text><text x="${x + 30}" y="${y + 17}" font-size="12" fill="${muted}" font-weight="600">${n}</text>`);
        x += 56;
      }
      text.push(m.reactions.map(([, n]) => n).join(' '));
      y += 24;
    }
    if (m.replies) {
      y += 24;
      out.push(`<text x="80" y="${y}" font-size="13" font-weight="700" fill="${link}">${esc(m.replies)}</text>`);
      text.push(m.replies);
    }
    y += i < messages.length - 1 ? 18 : 24;
  });
  const h = y + 8;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" font-family="Inter"><rect width="${width}" height="${h}" fill="${bg}"/>${out.join('\n')}</svg>`;
  return { svg, text: text.join('\n') };
}

// ---- the spike's dataset --------------------------------------------------------------------------------------------

export interface DatasetMessage {
  id: string;
  channel: { name: string; type: 'public' | 'private' | 'im' | 'mpim' };
  iso: string;
  user: string;
  text: string;
  thread?: { user: string; text: string; iso: string }[];
  reactions?: [string, number][];
  label: string;
  keep: boolean | null;
  note?: string;
}

export interface Dataset {
  me: { id: string; name: string; handle: string };
  users: { id: string; name: string; handle: string }[];
  messages: DatasetMessage[];
}

export const DATASET: Dataset = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'messages.json'), 'utf8'));
const userName = (id: string) => DATASET.users.find((u) => u.id === id)?.name ?? id;
const EMOJI: Record<string, string> = { tada: '🎉', raised_hands: '🙌', pray: '🙏', heart: '❤', rocket: '🚀', fire: '🔥', '100': '💯', clap: '👏', trophy: '🏆' };
const clock = (iso: string) => {
  const d = new Date(iso);
  const h = d.getUTCHours();
  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
/** `<@U01ALEX>` as Slack shows it: `@Alex Marlowe`. */
const resolve = (t: string) => t.replace(/<@(U\w+)>/g, (_, id: string) => `@${userName(id)}`);

/** A message as a screenshot of its channel (or DM), with the thread it replies to above it. */
export function datasetShot(m: DatasetMessage, opts: { dark?: boolean } = {}): { svg: string; text: string } {
  const thread = m.thread ?? [];
  const msgs: ChatMessage[] = [
    ...thread.map((t, i) => ({ author: userName(t.user), time: clock(t.iso), text: resolve(t.text), ...(i === 0 ? { replies: `${thread.length} ${thread.length === 1 ? 'reply' : 'replies'}` } : {}) })),
    { author: userName(m.user), time: clock(m.iso), text: resolve(m.text), ...(m.reactions?.length ? { reactions: m.reactions.map(([e, n]) => [EMOJI[e] ?? '·', n] as [string, number]) } : {}) },
  ];
  const dm = m.channel.type === 'im' || m.channel.type === 'mpim';
  // a DM's window is titled with the other people's names (dm:priya → Priya Raman; mpdm-alex.m--sam.o--lee → Sam
  // Okafor, Lee Chen), never yours
  const handles = m.channel.name.startsWith('dm:') ? [m.channel.name.slice(3)] : m.channel.name.replace(/^mpdm-/, '').split('--');
  const others = handles.flatMap((h) => DATASET.users.filter((u) => u.id !== DATASET.me.id && (u.handle === h || u.handle.split('.')[0] === h)).map((u) => u.name));
  const dmTitle = others.join(', ') || m.channel.name;
  const title = thread.length ? 'Thread' : dm ? dmTitle : `# ${m.channel.name}`;
  return chat({ title, ...(thread.length ? { subtitle: dm ? `with ${dmTitle}` : `# ${m.channel.name}` } : {}), messages: msgs, ...(opts.dark ? { dark: true } : {}) });
}

// ---- other screenshots ----------------------------------------------------------------------------------------------

function dashboard(): string {
  const W = 900;
  const H = 480;
  const kpis = [
    ['Monthly revenue', '$1.24M', '+12% vs last month'],
    ['Active accounts', '18,402', '+3.1%'],
    ['Churn', '2.1%', '-0.4 pts'],
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter"><rect width="${W}" height="${H}" fill="#151821"/>
<text x="28" y="40" font-size="20" fill="#e6e9ef" font-weight="700">Revenue overview</text>
<text x="${W - 28}" y="40" text-anchor="end" font-size="14" fill="#8a93a6">Alex Marlowe ▾</text>
<text x="28" y="66" font-size="13" fill="#8a93a6">Last 30 days · all regions · updated 9:42 AM</text>
${kpis.map(([k, v, d], i) => `<rect x="${28 + i * 284}" y="92" width="264" height="120" rx="10" fill="#1e2230"/><text x="${48 + i * 284}" y="124" font-size="13" fill="#8a93a6">${k}</text><text x="${48 + i * 284}" y="166" font-size="30" fill="#e6e9ef" font-weight="700">${esc(v)}</text><text x="${48 + i * 284}" y="194" font-size="13" fill="#5fd38d">${esc(d)}</text>`).join('\n')}
<path d="M28,420 L140,400 L252,410 L364,360 L476,350 L588,300 L700,290 L872,250" fill="none" stroke="#7aa2ff" stroke-width="3"/>
<text x="28" y="452" font-size="12" fill="#8a93a6">Sep 1</text><text x="${W - 28}" y="452" text-anchor="end" font-size="12" fill="#8a93a6">Sep 30</text>
</svg>`;
}

function codeEditor(): string {
  const code = [
    ['1', 'import { retry } from "./retry";', ''],
    ['2', '', ''],
    ['3', '// Batch the ledger writes: one round trip per 50 rows.', 'Alex Marlowe, 3 days ago · batch ledger writes'],
    ['4', 'export async function flush(rows: Row[]) {', ''],
    ['5', '  for (const chunk of chunks(rows, 50)) {', ''],
    ['6', '    await retry(() => db.insert(chunk), { tries: 3 });', ''],
    ['7', '  }', ''],
    ['8', '  return rows.length; // nice and simple', 'Jordan Kim, 2 weeks ago · great simplification'],
    ['9', '}', ''],
  ];
  const W = 1000;
  const H = 80 + code.length * 26;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#1e1e1e"/>
<rect width="${W}" height="36" fill="#252526"/><text x="16" y="24" font-family="Inter" font-size="13" fill="#cccccc">ledger.ts — payments-api</text>
${code.map(([n, c, blame], i) => `<text x="16" y="${70 + i * 26}" font-family="JetBrains Mono" font-size="14" fill="#858585">${n}</text><text x="56" y="${70 + i * 26}" font-family="JetBrains Mono" font-size="14" fill="#d4d4d4" xml:space="preserve">${esc(c)}</text>${blame ? `<text x="${W - 16}" y="${70 + i * 26}" text-anchor="end" font-family="Inter" font-size="12" fill="#6a6a6a">${esc(blame)}</text>` : ''}`).join('\n')}
</svg>`;
}

function invite(): string {
  const W = 760;
  const H = 340;
  const rows = [
    ['When', 'Weekdays, 9 AM – 9:15 AM PT'],
    ['Organiser', 'Priya Raman'],
    ['Guests', 'Alex Marlowe, Jordan Kim, Sam Okafor'],
    ['Notes', 'Daily standup. Keep it short, thanks all! Great to have AM PT folks joining.'],
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter"><rect width="${W}" height="${H}" fill="#ffffff"/>
<rect x="24" y="24" width="10" height="44" rx="3" fill="#1a73e8"/><text x="48" y="54" font-size="24" fill="#202124">Payments standup</text>
${rows.map(([k, v], i) => `<text x="48" y="${110 + i * 52}" font-size="13" fill="#5f6368">${k}</text><text x="160" y="${110 + i * 52}" font-size="15" fill="#202124">${esc(v)}</text>`).join('\n')}
<rect x="48" y="${H - 52}" width="90" height="32" rx="16" fill="#1a73e8"/><text x="93" y="${H - 31}" text-anchor="middle" font-size="14" fill="#fff">Yes</text>
</svg>`;
}

function email(): string {
  const W = 760;
  const body = [
    'Hi Alex,',
    '',
    'I wanted to put this in writing: the way you ran the billing migration was',
    'fantastic. Finance closed the month two days early because the ledger',
    'reconciled first time, and that has never happened before.',
    '',
    'Thank you,',
    'Dana',
  ];
  const H = 170 + body.length * 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter"><rect width="${W}" height="${H}" fill="#ffffff"/>
<text x="32" y="44" font-size="22" fill="#202124">The billing migration</text>
<text x="32" y="80" font-size="14" fill="#202124" font-weight="700">Dana Whitfield</text><text x="32" y="100" font-size="13" fill="#5f6368">to me</text>
<line x1="32" y1="118" x2="${W - 32}" y2="118" stroke="#e0e0e0"/>
${body.map((l, i) => `<text x="32" y="${152 + i * 24}" font-size="15" fill="#202124">${esc(l)}</text>`).join('\n')}
</svg>`;
}

const blank = () => `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" fill="#ffffff"/></svg>`;

// ---- the cases -------------------------------------------------------------------------------------------------------

export interface Case {
  id: string;
  /** What the rules should say. `documented` cases pass, and shouldn't: the limits of rules (no tone, no "for whom"). */
  expect: 'pass' | 'fail';
  documented?: string;
  why: string;
  svg: string;
  /** Render at this zoom (a small, non-Retina screenshot, or a Retina one). */
  zoom?: number;
}

const msg = (author: string, time: string, text: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({ author, time, text, ...extra });

export const CASES: Case[] = [
  {
    id: 'praise-billing',
    expect: 'pass',
    why: 'names Alex (@-mention) and praises: "beautifully", "Thank you"',
    svg: chat({ title: '# eng-billing', messages: [msg('Dana Whitfield', '4:52 PM', 'Billing cutover is DONE. 41k subscriptions on the new ledger and not a single customer-facing error. @Alex Marlowe ran the dual-write plan beautifully. Thank you, this was a scary one.', { reactions: [['🎉', 21], ['🚀', 11], ['🙏', 8]], replies: '12 replies' })] }).svg,
  },
  {
    id: 'praise-incident-small',
    expect: 'pass',
    why: '"Kudos to @Alex Marlowe", as a small non-Retina screenshot (0.6×: the upscale has to work)',
    zoom: 0.6,
    svg: chat({ title: '# incidents', messages: [msg('Oskar Lindqvist', '5:38 PM', 'Kudos to @Alex Marlowe for the new pager-bot timeline export. The postmortem for INC-2291 took 20 minutes instead of half a day.', { reactions: [['🙌', 8], ['🔥', 5]] })] }).svg,
  },
  {
    id: 'praise-preflight-retina',
    expect: 'pass',
    why: '"Huge shoutout to @Alex Marlowe", at 2× (a Retina screenshot)',
    zoom: 2,
    svg: chat({ title: '# preflight', messages: [msg('Imani Brooks', '9:14 AM', 'Huge shoutout to @Alex Marlowe for getting offline checklist sync over the line. Crews ran 140 checklists this weekend on the hangar Wi-Fi and we had zero sync conflicts.', { reactions: [['🙌', 14], ['🎉', 9]], replies: '7 replies' })] }).svg,
  },
  {
    id: 'praise-thanks-weak',
    expect: 'pass',
    why: 'only weak praise ("thanks"), lifted by the chat cues (d)',
    svg: chat({ title: '# design-crit', messages: [msg('Sun-hee Lim', '2:20 PM', 'Crew test went really well today, every tap target hit first time. @Alex Marlowe thanks for pushing for the bigger hit areas when I was ready to ship the small ones!')] }).svg,
  },
  {
    id: 'praise-dark',
    expect: 'pass',
    why: 'Slack in dark mode: light text on a dark background',
    svg: chat({ dark: true, title: '# payments-eng', messages: [msg('Priya Raman', '11:03 AM', 'Shoutout to Alex for the idempotency-key work: it saved us from double-charging about 1,200 customers during the retry storm.', { reactions: [['🙏', 12]] })] }).svg,
  },
  {
    id: 'praise-initials',
    expect: 'pass',
    why: 'initials only ("AM\'s"), case-sensitive, not a time',
    svg: chat({ title: '# mobile', messages: [msg('Chris Alvarez', '3:05 PM', "Battery usage dropped 18% on Android with AM's background sync batching. Amazing work, the store rating went from 3.9 to 4.4.")] }).svg,
  },
  {
    id: 'praise-thread-reply',
    expect: 'pass',
    why: "a reply in a thread under Alex's own post, naming nobody else (the reply-to-you form of (a))",
    svg: chat({ title: 'Thread', subtitle: '# search-team', messages: [msg('Alex Marlowe', '10:02 AM', 'RFC: a simpler ranking pipeline, one stage instead of three.', { replies: '2 replies' }), msg('Jordan Kim', '10:30 AM', '+1, this design is way simpler and the latency numbers speak for themselves. Great work.')] }).svg,
  },
  {
    id: 'praise-email',
    expect: 'pass',
    why: 'not a chat: an email that names Alex and says "fantastic", "Thank you"',
    svg: email(),
  },
  {
    id: 'other-in-passing',
    expect: 'pass',
    documented: "praise for Taylor that names Alex in passing passes: the rules can't tell whom the praise is for",
    why: 'shoutout to Taylor; Alex is mentioned for reviewing',
    svg: chat({ title: '# kudos', messages: [msg('Dana Whitfield', '1:12 PM', 'Huge shoutout to @Taylor Nguyen for shipping dark mode end to end! Thanks also to @Alex Marlowe for the reviews.')] }).svg,
  },
  {
    id: 'praise-other',
    expect: 'fail',
    why: 'praise for someone else, Alex not named',
    svg: chat({ title: '# kudos', messages: [msg('Lee Chen', '4:40 PM', 'Massive kudos to the SRE team for the zero-downtime Postgres upgrade. Amazing work everyone.')] }).svg,
  },
  {
    id: 'not-me-alex-p',
    expect: 'fail',
    why: '"Alex P" is a different person (notMe)',
    svg: chat({ title: '# design', messages: [msg('Morgan Diaz', '1:00 PM', 'Kudos to Alex P for the new icon set, it looks amazing!')] }).svg,
  },
  {
    id: 'own-message',
    expect: 'fail',
    why: "Alex's own message praising someone else",
    svg: chat({ title: '# kudos', messages: [msg('Alex Marlowe', '3:12 PM', 'Huge shoutout to @Taylor Nguyen for shipping dark mode end-to-end. Proud of you!')] }).svg,
  },
  {
    id: 'trivial-ack',
    expect: 'fail',
    why: 'just "thx AM"',
    svg: chat({ title: '# payments-eng', messages: [msg('Sam Okafor', '11:00 AM', 'thx AM')] }).svg,
  },
  {
    id: 'sarcasm',
    expect: 'pass',
    documented: "sarcasm passes: rules can't read tone (the future judge's job)",
    why: '"Love that @Alex Marlowe…", sarcastic',
    svg: chat({ title: '# general', messages: [msg('Chris Alvarez', '9:31 AM', "Love that @Alex Marlowe scheduled the 'quick sync' for 90 minutes. Very efficient. Amazing.")] }).svg,
  },
  { id: 'dashboard', expect: 'fail', why: "a dashboard with Alex's name in its account menu and no praise", svg: dashboard() },
  { id: 'code-editor', expect: 'fail', why: 'a code editor: git blame names Alex; "nice" and "great" are only weak praise outside a chat', svg: codeEditor() },
  { id: 'standup-invite', expect: 'fail', why: 'a "9 AM PT" standup invite listing Alex: AM is a time, "thanks" and "great" are weak outside a chat', svg: invite() },
  { id: 'blank', expect: 'fail', why: 'a blank image: no text at all', svg: blank() },
];

export const caseById = (id: string) => CASES.find((c) => c.id === id)!;
