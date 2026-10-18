// The starter ai/what-counts.md (SPEC R21): "what counts as a win for me", written from your profile the first time the
// judge is switched on, and what Reset puts back. Yours to edit; the judge sends it with every call. Adapted from the
// Found spike's instructions file, written fresh and generic (D2): no names but yours, from profile.yaml.
import type { JudgeProfile } from '../prompts/judge-screenshot.js';

const quoted = (xs: readonly string[]) => xs.map((x) => `"${x}"`).join(', ').replace(/, ([^,]*)$/, ' or $1');

export function whatCountsStarter(profile: JudgeProfile | null): string {
  const name = profile?.name?.trim();
  const aliases = [...new Set((profile?.aliases ?? []).map((a) => a.trim()).filter((a) => a && a !== name))];
  const notMe = (profile?.notMe ?? []).map((n) => n.trim()).filter(Boolean);
  const me = name
    ? `I'm ${name}${aliases.length ? ` (people also write ${quoted(aliases)})` : ''}.${profile?.role?.trim() ? ` I work as ${profile.role.trim()}.` : ''}`
    : "This is about me, the person who uses this BragDoc.";
  return `# What counts as a win for me

${me}
${notMe.length ? `${quoted(notMe)} ${notMe.length === 1 ? 'is someone else' : 'are other people'}, not me.\n` : ''}
Keep a message when it's **about my work** and says something I'd want in a self-review or a promotion case:

- Someone praises or thanks me for something specific I did: something I shipped or fixed, a design, a review, an
  incident I handled, docs, a talk, mentoring.
- It shows the impact of my work: numbers, money saved, customers or revenue, incidents avoided, other teams using it.
- My manager or leadership recognises me: a nomination, an award, calibration, a promotion.
- Someone tells me my help or mentoring made a difference to them.
- Credit shared between a few named people, me included, is fine if there was real impact.

Don't keep:

- Routine "thanks", "ty" or "👍" for small favours, links or logistics.
- Praise for other people, even if I'm mentioned in passing.
- Things I said praising others.
- Sarcasm, jokes or backhanded comments.
- Requests, scheduling, bot notifications and general chatter.

For merged pull requests, keep the notable ones: a feature, a real fix, a performance or cost win, a migration.
Dependency and version bumps, typo fixes, reverts and small chores are routine.

When in doubt, keep it with low confidence. I review everything before it's saved.
`;
}
