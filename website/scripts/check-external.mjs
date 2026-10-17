// Checks the built site (dist/) loads nothing from anywhere but itself: no font CDN, no analytics, no script, style,
// image, media, font or frame from another origin. BragDoc promises to send nothing off your machine on its own, and
// its docs keep to the same rule (SPEC R16, website/CLAUDE.md). No dependencies; run after `npm run build`:
//
//   node scripts/check-external.mjs
//
// Exits 1 and lists every offender. Plain links to other sites (<a href>) are fine: following one is the reader's
// choice, not something the page does by itself. So are metadata links (canonical, alternate, sitemap) and the
// absolute URLs in this site's own og: tags, which no browser fetches. test/docs.test.ts runs `fetchedUrls` over
// fixtures, so a gap here fails the root suite.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** A scheme-qualified (`https:`, `data:` excepted) or protocol-relative URL: somewhere other than this site. */
export function isExternal(url) {
	const u = url.trim().replaceAll('&amp;', '&');
	if (/^(data|blob|about|javascript|mailto|tel):/i.test(u)) return false;
	return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(u);
}

/** Attributes of one tag, whatever the quoting (`"x"`, `'x'` or bare). */
function attrs(tag) {
	const out = {};
	for (const m of tag.matchAll(/([^\s"'<>\/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
	return out;
}

const srcset = (v) => v.split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean);

/** URLs a stylesheet loads: url(…) and @import. */
function cssUrls(css) {
	return [...css.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi), ...css.matchAll(/@import\s+(["'])([^"']+)\1/gi)].map((m) => m[2]);
}

/** URLs a script loads by itself: static and dynamic imports, fetch, workers, sockets, beacons, given a literal. */
function jsUrls(js) {
	const lit = `(["'\`])((?:https?:)?\\/\\/[^"'\`]+)\\1`;
	const res = [
		new RegExp(`\\bimport\\s*\\(\\s*${lit}`, 'g'), // import("…")
		new RegExp(`\\bimport\\s*${lit}`, 'g'), // import "…"
		new RegExp(`\\bfrom\\s*${lit}`, 'g'), // import x from "…"
		new RegExp(`\\b(?:fetch|importScripts|Worker|SharedWorker|EventSource|WebSocket|sendBeacon)\\s*\\(\\s*${lit}`, 'g'),
	];
	return res.flatMap((re) => [...js.matchAll(re)].map((m) => m[2]));
}

/** Link relations a browser acts on by itself. canonical, alternate, sitemap, describedby, me… are metadata. */
const FETCHING_REL = /\b(stylesheet|preload|modulepreload|prefetch|prerender|preconnect|dns-prefetch|icon|apple-touch-icon|manifest|mask-icon)\b/i;

/** Every URL in one built file that the browser fetches on its own when the page loads. */
export function fetchedUrls(file, text) {
	if (file.endsWith('.css')) return cssUrls(text);
	if (/\.(js|mjs)$/.test(file)) return jsUrls(text);
	if (file.endsWith('.webmanifest') || file.endsWith('manifest.json')) return [...text.matchAll(/"(?:src|start_url|scope)"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
	// HTML and SVG
	const urls = [];
	for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) urls.push(...cssUrls(m[1]));
	for (const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
		const a = attrs(m[1]);
		if (a.src) urls.push(a.src);
		else urls.push(...jsUrls(m[2]));
	}
	for (const m of text.matchAll(/<([a-z][a-z0-9:-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)) {
		const name = m[1].toLowerCase();
		const a = attrs(m[2]);
		if (a.style) urls.push(...cssUrls(a.style));
		if (name === 'script' || name === 'a') continue; // scripts handled above; anchors are the reader's choice
		if (name === 'link') {
			if (a.href && FETCHING_REL.test(a.rel ?? '')) urls.push(a.href);
			if (a.imagesrcset) urls.push(...srcset(a.imagesrcset));
			continue;
		}
		if (a.src) urls.push(a.src);
		if (a.srcset) urls.push(...srcset(a.srcset));
		if (a.poster) urls.push(a.poster);
		if (name === 'object' && a.data) urls.push(a.data);
		// SVG: <image>, <use>, <feImage> load their href
		if (/^(image|use|feimage)$/.test(name)) {
			if (a.href) urls.push(a.href);
			if (a['xlink:href']) urls.push(a['xlink:href']);
		}
	}
	return urls;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
	if (!existsSync(dist)) {
		console.error('check-external: no dist/; run `npm run build` first');
		process.exit(1);
	}
	const files = (dir) =>
		readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
			const p = join(dir, e.name);
			return e.isDirectory() ? files(p) : /\.(html|svg|css|js|mjs|webmanifest)$/.test(e.name) ? [p] : [];
		});
	const bad = [];
	let checked = 0;
	for (const f of files(dist)) {
		for (const url of fetchedUrls(f, readFileSync(f, 'utf8'))) {
			checked++;
			if (isExternal(url)) bad.push(`${relative(dist, f)}: ${url}`);
		}
	}
	if (bad.length) {
		console.error(`check-external: ${bad.length} third-party request(s) in dist/:\n  ${[...new Set(bad)].join('\n  ')}`);
		process.exit(1);
	}
	console.log(`check-external: ${checked} URLs the pages fetch, all on this site`);
}
