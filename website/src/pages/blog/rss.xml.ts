// /blog/rss.xml: the blog as an RSS feed (linked from every page's <head> in astro.config.mjs, and from /blog/).
import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { posts } from '../../blog';
import { TITLE } from '../../site.mjs';

export const GET: APIRoute = async (context) =>
	rss({
		title: `${TITLE} blog`,
		description: 'Notes on building BragDoc, the local-first, open-source achievement tracker.',
		site: context.site!,
		items: (await posts()).map((p) => ({
			title: p.data.title,
			description: p.data.description,
			pubDate: p.data.date,
			author: p.data.author,
			link: `/blog/${p.id}/`,
		})),
	});
