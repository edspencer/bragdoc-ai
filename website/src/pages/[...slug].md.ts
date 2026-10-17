// Every docs page's Markdown, at its URL with `.md` instead of the trailing slash: /reference/config-yaml/ →
// /reference/config-yaml.md (the llms.txt proposal's per-page Markdown copies, https://llmstxt.org). /llms.txt
// (src/pages/llms.txt.ts) links these, and each page's <head> points at its copy (src/routeData.ts). It's the page's source,
// frontmatter replaced by its title and description; MDX pages keep their imports and components as written.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

export const getStaticPaths: GetStaticPaths = async () =>
	(await getCollection('docs')).filter((e) => e.id !== '404').map((entry) => ({ params: { slug: entry.id }, props: { entry } }));

export const GET: APIRoute = ({ props }) => {
	const { data, body } = (props as { entry: CollectionEntry<'docs'> }).entry;
	const head = `# ${data.title}\n\n${data.description ? `> ${data.description}\n\n` : ''}`;
	return new Response(head + (body ?? '').trim() + '\n', { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
