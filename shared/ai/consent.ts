// What a cloud connection would send, and to whom (SPEC R17, principle 5). A cloud connection makes no request at all
// until you accept its statement; the consent dialog (PR23) and the docs' provider pages (PR29) are both made from
// this file, so they can't disagree. Pure data.
//
// Each statement is versioned. Consent is stored as `{ at, version, host }` on the connection and counts only while
// its version is at least the statement's and its host is the connection's: a later version that sends more, or the
// same connection pointed somewhere else, asks again. Bump `version` whenever `sends` grows.
//
// The policy links are external URLs in the web bundle once PR23 shows them: test/web.test.ts allow-lists each.
import type { AiCallFeature, AiKind } from './connections.js';

export interface ConsentStatement {
  /** Bump when `sends` grows: everyone who consented to less is asked again. */
  version: number;
  /** Who receives it: the provider's name, or null for a server you typed in. */
  provider: string | null;
  /** Their privacy policy, or null ("unknown provider: check their terms"). */
  policyUrl: string | null;
  /** What each feature sends, field by field, in plain words. */
  sends: Partial<Record<AiCallFeature, string[]>>;
  /** Stated for every provider. */
  notes: string[];
}

const JUDGE = [
  "The text of a screenshot Found picked up (read on this computer), with your own messages marked",
  "For a merged pull request (if you tick it): its repository, title, the first 2,000 characters of its description, and the date",
  'Your name, the other names you go by, and the names to ignore',
  "Your active projects' names",
  "Your “what counts as a win” instructions",
];
const TIDY = [
  'The text you pasted, or the text read from a picture you added',
  "Today's date, and your name and role",
  "Your projects' names",
  "Your “how I write” notes, if you wrote some",
];
const DRAFT = [
  'The achievements in the folio you picked: titles, summaries, dates, impact, project and company names, and evidence by name',
  'Your name and role',
  "Your note on what the draft is for, if you wrote one",
  "Your “how I write” notes, if you wrote some",
];
const TEST = ['A one-line test question (nothing of yours)'];

const NOTES = [
  'It goes from this computer straight to that host, under your account and their terms. BragDoc’s makers see nothing: there is no BragDoc server in between.',
  'Your key stays in secrets.yaml on this computer (readable by you alone), and is sent only to that host.',
  'To stop: Settings → AI → the connection → Revoke. Nothing more is sent from that moment.',
];

const CLOUD: ConsentStatement = { version: 1, provider: null, policyUrl: null, sends: { judge: JUDGE, tidy: TIDY, draft: DRAFT, test: TEST }, notes: NOTES };

export const CONSENT: Record<'anthropic' | 'openai' | 'openrouter' | 'jev' | 'custom', ConsentStatement> = {
  anthropic: { ...CLOUD, provider: 'Anthropic', policyUrl: 'https://www.anthropic.com/legal/privacy' },
  openai: { ...CLOUD, provider: 'OpenAI', policyUrl: 'https://openai.com/policies/privacy-policy/' },
  openrouter: { ...CLOUD, provider: 'OpenRouter', policyUrl: 'https://openrouter.ai/privacy' },
  // Jev's own consent (D82), apart from the OpenRouter connection whose key it uses. Version 2: what it sends grew to
  // the judge's whole list (a PR's details, your names), as for a chat model
  jev: {
    ...CLOUD,
    version: 2,
    provider: 'OpenRouter, for TypeSafe’s Jev',
    policyUrl: 'https://openrouter.ai/privacy',
    sends: { judge: JUDGE, test: TEST },
    notes: [
      'It goes from this computer to OpenRouter, which passes it to TypeSafe AI, who run Jev. BragDoc’s makers see nothing: there is no BragDoc server in between.',
      'Jev answers with probabilities only (“a win: 93%”, and which project). It never says why, and BragDoc never makes a reason up for it.',
      'It uses the key of the OpenRouter connection it goes through: that stays in secrets.yaml on this computer (readable by you alone), and is sent only to that connection’s host. A new key there, or removing it, asks for this consent again.',
      'To stop: Settings → AI → the Jev connection → Revoke. Nothing more is sent to Jev from that moment, even while the OpenRouter connection stays allowed.',
    ],
  },
  // any server you typed in that isn't on this computer or your network, whatever kind you chose for it
  custom: CLOUD,
};

/** The statement a connection of `kind` is shown: the provider's own, or the unknown-provider one. */
export function consentStatement(kind: AiKind): ConsentStatement {
  return kind === 'anthropic' || kind === 'openai' || kind === 'openrouter' || kind === 'jev' ? CONSENT[kind] : CONSENT.custom;
}

/** Does stored consent still cover this connection (same host, a version at least the statement's)? */
export function consentCurrent(kind: AiKind, consent: { version: number; host?: string } | null | undefined, host: string | null): boolean {
  // a consent that doesn't say which host it was for covers none: the address can change under it
  if (!consent || !host || consent.host !== host) return false;
  return consent.version >= consentStatement(kind).version;
}
