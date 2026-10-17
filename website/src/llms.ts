// The llms.txt files (https://llmstxt.org) for this docs site, built from the docs collection at build time.
//
// Generated here from the pages themselves, in sidebar order (Hallway's arrangement), so they can't go stale or link a
// page that doesn't exist. The app will serve its own /llms.txt (its agent guide, SPEC R11); this one describes the
// docs site.
import { getCollection, type CollectionEntry } from 'astro:content';
import { SIDEBAR } from './sidebar.mjs';
import { SITE_URL, TITLE, TAGLINE, RELEASED, INSTALL_COMMAND } from './site.mjs';

type Entry = CollectionEntry<'docs'>;
interface Section {
	label: string;
	entries: Entry[];
}

/** Docs pages grouped and ordered as in the sidebar. */
export async function sections(): Promise<Section[]> {
	const byId = new Map((await getCollection('docs')).map((e) => [e.id, e]));
	const out: Section[] = [];
	const loose: Entry[] = [];
	for (const item of SIDEBAR) {
		if (item.slug) {
			const e = byId.get(item.slug);
			if (e) loose.push(e);
			continue;
		}
		const entries = (item.items ?? []).map((i: { slug: string }) => byId.get(i.slug)).filter(Boolean) as Entry[];
		out.push({ label: item.label, entries });
	}
	if (loose.length) out.push({ label: 'More', entries: loose });
	return out;
}

const status = RELEASED
	? `**Status:** released on npm (\`${INSTALL_COMMAND}\`, Node 22.12+). What shipped in each release is at ${SITE_URL}/whats-new/.`
	: `**Status:** v0.1 is being built and is not on npm yet. These pages describe what v0.1 is being built to do; pages marked "Coming in v0.1" describe features that don't exist yet. See ${SITE_URL}/roadmap/.`;

export const intro = `# ${TITLE}

> ${TAGLINE}. BragDoc runs on your own computer (macOS and Linux) and keeps your achievements, and the evidence for them (screenshots, PDFs, links, GitHub pull requests, quotes), as plain Markdown and YAML files in a folder you own. It is open source (MIT), has no account and no telemetry, and sends nothing off your machine except calls to services you connect yourself. Every AI feature is off unless you turn it on.

${status}

Every page below is also available as Markdown at the same URL with \`.md\` instead of the trailing slash.
`;

/** `/introduction/` → `https://…/introduction.md` */
export const mdUrl = (e: Entry) => `${SITE_URL}/${e.id}.md`;
