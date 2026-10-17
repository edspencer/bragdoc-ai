// The blog's posts, newest first, without drafts. Shared by the index, the post pages and the RSS feed.
import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

export async function posts(): Promise<Post[]> {
	return (await getCollection('blog', (p) => !p.data.draft)).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** "17 October 2026", in UTC so a post's date never shifts with the build machine's time zone. */
export const longDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "Sat 17 Oct", the app's card date (handwritten on the board). */
export const cardDate = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
