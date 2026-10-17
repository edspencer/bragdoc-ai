// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import { SITE_URL, REPO_URL, TITLE, TAGLINE } from './src/site.mjs';
import { SIDEBAR } from './src/sidebar.mjs';

// No analytics, no font CDN, no client-side diagram library from a CDN: the built site loads nothing from anywhere
// but itself (BragDoc's own promise is that it sends nothing off your machine, and its docs keep to the same rule).
// scripts/check-external.mjs fails the build check on any external <script>, stylesheet, image or font.

// https://astro.build/config
export default defineConfig({
	site: SITE_URL,
	// Astro 7's default, 'jsx', strips whitespace between elements, which glues inline
	// text together ("Edit pagePrevious…"). `true` keeps Astro 5/6's HTML-aware rules.
	compressHTML: true,
	integrations: [
		sitemap(),
		starlight({
			title: TITLE,
			description: TAGLINE,
			// Fonts (all OFL, self-hosted from @fontsource: the app's four), then the tokens and the Starlight mapping.
			customCss: [
				'@fontsource-variable/instrument-sans',
				'@fontsource-variable/bricolage-grotesque',
				'@fontsource-variable/geist-mono',
				'@fontsource/caveat/500.css',
				'./src/styles/custom.css',
			],
			// The mark from the repo's brand kit (../brand, copied in by `npm run sync-brand`); the wordmark is text in
			// the brand face (custom.css), lowercase as in the app header.
			logo: {
				src: './src/assets/mark.svg',
				alt: '',
			},
			favicon: '/favicon.svg',
			components: {
				// Every docs page says where v0.1 stands (src/components/Banner.astro).
				Banner: './src/components/Banner.astro',
				// A "Blog" link next to the GitHub icon (the blog is outside the docs sidebar).
				SocialIcons: './src/components/SocialIcons.astro',
			},
			// Each page's <head> links its Markdown copy and /llms.txt, for agents (src/routeData.ts).
			routeMiddleware: './src/routeData.ts',
			head: [
				// .ico fallback for the browsers and crawlers that ignore SVG icons.
				{ tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: '32x32' } },
				{ tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
				{ tag: 'link', attrs: { rel: 'alternate', type: 'application/rss+xml', title: `${TITLE} blog`, href: '/blog/rss.xml' } },
				// Social-share image. Starlight already emits per-page og:title,
				// og:description, og:url and twitter:card=summary_large_image, and a user
				// `head` entry OVERRIDES those, so we must not restate them here. The one
				// thing Starlight has no default for is the image.
				{ tag: 'meta', attrs: { property: 'og:image', content: `${SITE_URL}/og-image.png` } },
				{ tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
				{ tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
				{ tag: 'meta', attrs: { property: 'og:image:alt', content: `${TITLE}: ${TAGLINE.toLowerCase()}` } },
				{ tag: 'meta', attrs: { name: 'twitter:image', content: `${SITE_URL}/og-image.png` } },
			],
			social: [{ icon: 'github', label: 'GitHub', href: REPO_URL }],
			editLink: {
				baseUrl: `${REPO_URL}/edit/next/website/`,
			},
			// Hand-maintained in src/sidebar.mjs: Starlight does NOT auto-discover pages.
			sidebar: SIDEBAR,
		}),
	],
});
