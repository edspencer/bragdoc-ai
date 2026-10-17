// Starlight route middleware: each docs page's <head> links its Markdown copy (src/pages/[...slug].md.ts) and the
// llms.txt that describes the site, the two link relations the llms.txt proposal asks for (https://llmstxt.org).
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

export const onRequest = defineRouteMiddleware((context) => {
	const route = context.locals.starlightRoute;
	// Only docs pages have a Markdown copy: not the 404 page, and not the blog, which renders through <StarlightPage>
	// (src/pages/blog/) rather than from the docs collection.
	const isDoc = route.id !== '404' && route.id !== 'blog' && !route.id.startsWith('blog/');
	if (isDoc) route.head.push({ tag: 'link', attrs: { rel: 'alternate', type: 'text/markdown', href: `/${route.id}.md` } });
	route.head.push({ tag: 'link', attrs: { rel: 'describedby', type: 'text/plain', href: '/llms.txt' } });
});
