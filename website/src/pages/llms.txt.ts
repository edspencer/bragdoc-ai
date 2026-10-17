// /llms.txt: what this site is and where everything is, for coding agents (https://llmstxt.org). See src/llms.ts.
import type { APIRoute } from 'astro';
import { intro, mdUrl, sections } from '../llms';

export const GET: APIRoute = async () => {
	const body = (await sections())
		.map((s) => `## ${s.label}\n\n${s.entries.map((e) => `- [${e.data.title}](${mdUrl(e)})${e.data.description ? `: ${e.data.description}` : ''}`).join('\n')}`)
		.join('\n\n');
	return new Response(`${intro}\n${body}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
