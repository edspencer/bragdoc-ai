/**
 * Landing-page copy, in one place (Hallway's arrangement).
 *
 * Every string the landing page renders lives here, so the words can be worked on without touching markup.
 *
 * The rules (website/CLAUDE.md "Content rules"): this is a documentation site, not marketing. Say plainly what
 * BragDoc is, how to run it, and what it promises; no selling, no pricing, no testimonials. Every claim must be
 * checkable against SPEC/spec.md and the code. While v0.1 isn't released (RELEASED in site.mjs), the page says so next
 * to the install command: the features are built (on `next`), but there's nothing to install from npm yet.
 */

import { REPO_URL, INSTALL_COMMAND, RELEASED, DEFAULT_PORT } from '../../site.mjs';

export { REPO_URL };

export const hero = {
	/** Small line above the H1. */
	eyebrow: 'Open source · MIT licence · runs on your computer',
	/** The H1. */
	title: 'Keep a record of the work you did.',
	lede: 'BragDoc is a pinboard for your achievements and the evidence behind them: screenshots of kind words, PDFs, links, the pull requests you merged. It runs on your own computer and keeps everything as plain files in a folder you own.',
	body: 'When review season comes round, the evidence is already there, in one place, with dates.',
};

/** The install card. */
export const INSTALL = {
	command: INSTALL_COMMAND,
	/** What happens when you run it. */
	after: `Then open http://localhost:${DEFAULT_PORT}. Node 22.12 or later; macOS and Linux. Docker works too.`,
	/** The tag on the card: honest about whether it works yet. */
	tag: RELEASED ? 'On npm' : 'Not on npm yet',
	/** Under the card while there's no release. */
	notYet: RELEASED ? null : 'v0.1 is built in the open, on GitHub, but not released yet: until it is, this command won’t find anything. You can run it from source in the meantime.',
} as const;

/** The hero buttons. */
export const HERO_LINKS = [
	{ text: 'Read the docs', href: '/introduction/', primary: true },
	{ text: 'Quickstart', href: '/getting-started/quickstart/', primary: false },
	{ text: 'Source on GitHub', href: REPO_URL, primary: false },
] as const;

/** The board print under the hero: a real capture of the app (tools/docs-media, shots landing-board-light/-dark). */
export const SHOT = {
	alt: 'The BragDoc board: a "Drop it here." box for screenshots, PDFs and links, a strip saying 5 things found by your sources are waiting for a yes or no, a note that this is example data, and this week’s achievements as taped cards, one with a sticky-note quote and one with a screenshot of a chat message praising the work. Every name in it is invented.',
	tag: 'Real capture · example data',
	caption: 'The board, filled with BragDoc’s made-up example data.',
};

/**
 * The guarantees, worded precisely (SPEC "Product principles"). Each links the docs page that says how it's
 * enforced. Don't soften or embellish these: they are promises, and the pages behind them say exactly where the
 * edges are (the gh CLI's own traffic, for instance).
 */
export const GUARANTEES = [
	{
		title: 'Your data is just files',
		body: 'One Markdown file per achievement, YAML for everything else, in ~/.bragdoc. Read them, edit them, back them up, put them in git. There is no BragDoc cloud and no account: your data stays in files on your disk, served only to your own computer.',
		href: '/concepts/your-data-is-files/',
		link: 'How the files work',
		tape: 'tomato',
	},
	{
		title: 'Nothing leaves unless you connect it',
		body: 'BragDoc has no server. It never sends your data to us or to anyone else: no telemetry, no update check, no analytics. The only network calls it makes are to services you connect yourself (in v0.1, that means GitHub), and Settings → Network activity shows you every one.',
		href: '/guarantees/network-activity/',
		link: 'Network activity',
		tape: 'blue',
	},
	{
		title: 'AI is off unless you turn it on',
		body: 'v0.1 has no AI features at all, and everything works without them. Later versions may offer some, each one off until you switch it on. BragDoc will never install a model runtime or download a model by itself.',
		href: '/guarantees/ai-is-opt-in/',
		link: 'What “opt-in” means',
		tape: 'green',
	},
] as const;

/** "How it fits together": the vocabulary, one card each. */
export const HOW = {
	eyebrow: 'How it works',
	title: 'Drop it in. Sort it later.',
	steps: [
		{
			word: 'Board',
			title: 'Drop it on the board',
			body: 'Paste a screenshot, drop a PDF, paste a pull request link, or type a few words. Each achievement becomes a card, grouped by week, with its evidence pinned to it.',
			href: '/concepts/board/',
		},
		{
			word: 'Found',
			title: 'Let your sources find things',
			body: 'Turn on the sources you want: your merged GitHub pull requests, or a screenshots folder (read on your machine, with no AI). What they spot waits in Found for a yes or no. Nothing a source finds reaches the board without you.',
			href: '/concepts/found-and-sources/',
		},
		{
			word: 'Folio',
			title: 'Pull it together for a review',
			body: 'Pick a date range, filter by project or impact, and take the lot away as Markdown (export or copy it) or print it, ready for a self-review or a promotion case.',
			href: '/concepts/folio/',
		},
	],
} as const;

/** The agents strip. */
export const AGENTS = {
	eyebrow: 'Works with your coding agent',
	title: 'Your agent was there. Let it take notes.',
	body: 'BragDoc has an MCP server, so Claude Code (or any MCP client) can log what you just shipped, with the pull request attached, while it still remembers why it mattered. Its writes go straight onto your board, labelled as written by your agent (or into Found first, if you prefer). And because the data is just files, any agent that can edit a file can help.',
	link: { text: 'Agents and MCP', href: '/agents/overview/' },
	/** An achievement file in the format of docs/data-format.md (ids shortened). Illustrative, not real data. */
	file: 'achievements/2026/10/01M4XJCNXR….md',
	sample: `---
schemaVersion: 1
id: 01M4XJCNXRQ2X7Z4M8N6P0R5T1
title: Cut CI time from 14 to 6 minutes
happenedAt: 2026-10-14
impact: 6
projects: [01M2B7…]
evidence:
  - id: 01M4XJCNXS…
    kind: github_pr
    url: https://github.com/acme/web/pull/481
    externalKey: github_pr:acme/web#481
source: mcp
sourceAgent: Claude Code
archived: false
createdAt: 2026-10-14T16:02:11.000Z
updatedAt: 2026-10-14T16:02:11.000Z
---
Split the e2e suite across four runners and cached
the browser download.`,
} as const;

/** The closing section. */
export const OPEN = {
	title: 'Free, open source, yours.',
	body: 'BragDoc is MIT licensed and built in the open. There is nothing to buy and nothing to sign up for. Read the code, run it, change it, and send a pull request if you like.',
	hosted: {
		text: 'Used the hosted BragDoc? You can bring your data with you.',
		href: '/moving-from-the-hosted-app/',
	},
} as const;
