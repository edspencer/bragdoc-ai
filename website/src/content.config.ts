import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
	// The blog: one Markdown file per post in src/content/blog/, rendered by src/pages/blog/ inside Starlight's page
	// frame (so it shares the header, search and theme) but outside the docs sidebar. A post with `draft: true` is
	// left out of the build.
	blog: defineCollection({
		loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
		schema: z.object({
			title: z.string(),
			description: z.string(),
			date: z.coerce.date(),
			author: z.string().default('Ed Spencer'),
			draft: z.boolean().default(false),
		}),
	}),
};
