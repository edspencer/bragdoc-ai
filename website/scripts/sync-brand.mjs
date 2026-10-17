// Copies the brand kit from ../brand into this site (local-review's website/scripts/sync-brand.mjs).
//
// Cloudflare Pages builds with `website/` as the root directory, so the site doesn't reference ../brand at build
// time: the assets are COPIED in and committed. Run this after brand/ changes (`npm run sync-brand`), then commit.
// test/docs.test.ts (in the root suite) fails while a copy differs from its source.
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(site, '..', 'brand');

/** brand/<file> → website/<path>. Exported for test/docs.test.ts. */
export const BRAND_COPIES = {
	'mark.svg': 'src/assets/mark.svg',
	'favicon.svg': 'public/favicon.svg',
	'favicon.ico': 'public/favicon.ico',
	'apple-touch-icon.png': 'public/apple-touch-icon.png',
	'og-image.png': 'public/og-image.png',
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	if (!existsSync(brand)) {
		console.error('sync-brand: no ../brand directory');
		process.exit(1);
	}
	for (const [from, to] of Object.entries(BRAND_COPIES)) {
		copyFileSync(join(brand, from), join(site, to));
		console.log(`brand/${from} -> website/${to}`);
	}
}
