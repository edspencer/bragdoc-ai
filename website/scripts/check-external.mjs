// Checks the built site (dist/) loads nothing from anywhere but itself: no font CDN, no analytics, no script, style,
// image, font or frame from another origin. BragDoc promises to send nothing off your machine, and its docs keep to
// the same rule (SPEC R16, website/CLAUDE.md). No dependencies; run after `npm run build`:
//
//   node scripts/check-external.mjs
//
// Exits 1 and lists every offender. Plain links to other sites (<a href>) are fine: following one is the reader's
// choice, not something the page does by itself. So are the absolute URLs of this site's own canonical/og tags.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!existsSync(dist)) {
	console.error('check-external: no dist/; run `npm run build` first');
	process.exit(1);
}

const files = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
		const p = join(dir, e.name);
		return e.isDirectory() ? files(p) : /\.(html|css|js|mjs)$/.test(e.name) ? [p] : [];
	});

// Something outside this site: a scheme-qualified or protocol-relative URL.
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

/** Every URL in a file that the browser fetches on its own when the page loads. */
function fetched(file, text) {
	const urls = [];
	if (file.endsWith('.html')) {
		for (const m of text.matchAll(/<(script|img|iframe|source|video|audio|embed|track)\b[^>]*?\ssrc(?:set)?="([^"]+)"/gi))
			urls.push(...m[2].split(',').map((s) => s.trim().split(/\s+/)[0]));
		for (const m of text.matchAll(/<link\b[^>]*>/gi)) {
			const rel = /\srel="([^"]+)"/i.exec(m[0])?.[1] ?? '';
			const href = /\shref="([^"]+)"/i.exec(m[0])?.[1];
			// canonical, alternate, sitemap and describedby are metadata, never fetched by the page itself
			if (href && /\b(stylesheet|preload|modulepreload|prefetch|preconnect|dns-prefetch|icon|apple-touch-icon|manifest)\b/i.test(rel)) urls.push(href);
		}
		for (const m of text.matchAll(/<object\b[^>]*\sdata="([^"]+)"/gi)) urls.push(m[1]);
		for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) urls.push(...cssUrls(m[1]));
		for (const m of text.matchAll(/\sstyle="([^"]*)"/gi)) urls.push(...cssUrls(m[1]));
	} else if (file.endsWith('.css')) {
		urls.push(...cssUrls(text));
	} else {
		// JS: dynamic imports, workers and fetches of a literal external URL
		for (const m of text.matchAll(/\b(?:import|fetch|Worker|importScripts)\s*\(\s*["'`]((?:https?:)?\/\/[^"'`]+)["'`]/g)) urls.push(m[1]);
	}
	return urls;
}

function cssUrls(css) {
	return [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi), ...css.matchAll(/@import\s+["']([^"']+)["']/gi)].map((m) => m[1]);
}

const bad = [];
let checked = 0;
for (const f of files(dist)) {
	for (const url of fetched(f, readFileSync(f, 'utf8'))) {
		checked++;
		if (EXTERNAL.test(url.replaceAll('&amp;', '&'))) bad.push(`${relative(dist, f)}: ${url}`);
	}
}

if (bad.length) {
	console.error(`check-external: ${bad.length} third-party request(s) in dist/:\n  ${[...new Set(bad)].join('\n  ')}`);
	process.exit(1);
}
console.log(`check-external: ${checked} URLs the pages fetch, all on this site`);
