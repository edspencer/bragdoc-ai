// Checks the built site (dist/) for broken internal links: every site-relative href must resolve to a built file,
// and every #fragment to an id on the target page. No dependencies; run after `npm run build`:
//
//   node scripts/check-links.mjs
//
// Exits 1 and lists what's broken. External links aren't checked.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!existsSync(dist)) {
	console.error('check-links: no dist/; run `npm run build` first');
	process.exit(1);
}

const html = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
		const p = join(dir, e.name);
		return e.isDirectory() ? html(p) : e.name.endsWith('.html') ? [p] : [];
	});

/** The built file a site path is served from, or null. */
function target(path) {
	const p = join(dist, decodeURIComponent(path));
	if (existsSync(p) && statSync(p).isFile()) return p;
	const index = join(p, 'index.html');
	if (existsSync(index)) return index;
	if (existsSync(`${p}.html`)) return `${p}.html`;
	return null;
}

const ids = new Map();
function idsOf(file) {
	if (!ids.has(file)) ids.set(file, new Set([...readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
	return ids.get(file);
}


const broken = [];
let checked = 0;
for (const page of html(dist)) {
	const text = readFileSync(page, 'utf8');
	const here = '/' + relative(dist, page).replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
	for (const [, raw] of text.matchAll(/\shref="([^"]*)"/g)) {
		const href = raw.replaceAll('&amp;', '&');
		if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) continue; // external, mailto:, …
		const [pathPart, frag] = href.split('#');
		const path = (pathPart.split('?')[0] || here).replace(/^(?!\/)/, here.replace(/[^/]*$/, ''));
		checked++;
		const file = target(path);
		if (!file) broken.push(`${relative(dist, page)}: ${href} (no such page)`);
		else if (frag && file.endsWith('.html') && !idsOf(file).has(decodeURIComponent(frag)))
			broken.push(`${relative(dist, page)}: ${href} (no #${frag} on that page)`);
	}
}

if (broken.length) {
	console.error(`check-links: ${broken.length} broken internal link(s):\n  ${[...new Set(broken)].join('\n  ')}`);
	process.exit(1);
}
console.log(`check-links: ${checked} internal links OK`);
