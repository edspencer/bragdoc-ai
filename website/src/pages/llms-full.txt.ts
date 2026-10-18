// /llms-full.txt: every docs page's Markdown in one file, in sidebar order, for agents that want it all at once.
import type { APIRoute } from 'astro';
import { intro, sections, unShot } from '../llms';

export const GET: APIRoute = async () => {
	const pages = (await sections()).flatMap((s) =>
		s.entries.map((e) => `# ${e.data.title}\n\n${e.data.description ? `> ${e.data.description}\n\n` : ''}${unShot(e.body ?? '').trim()}\n`),
	);
	return new Response(`${intro}\n---\n\n${pages.join('\n---\n\n')}`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
