import Posts from '@/lib/blog/Posts';
import { Feed, type Item } from 'feed';
import markdownToHtml from '@/lib/markdownToHTML';

import config from '@bragdoc/config';

const { siteName, siteDescription, siteUrl, author } = config;

export async function GET(request: Request) {
  const posts = new Posts();
  const { publishedPosts } = posts;

  const items = await Promise.all(
    publishedPosts.map(async (post) => ({
      title: post.title,
      id: post.slug,
      link: post.link,
      content: (await markdownToHtml(posts.getContent(post))).value,
      date: new Date(post.date),
      image: post.images?.[0] ? `${siteUrl}${post.images[0]}` : undefined,
    })),
  );

  const feed = new Feed({
    title: siteName,
    description: siteDescription,
    id: siteUrl,
    link: siteUrl,
    image: `${siteUrl}/images/og-image.png`,
    favicon: `${siteUrl}/favicon.png`,
    copyright: `All rights reserved ${new Date().getFullYear()}, ${author.name}`,
    generator: 'Feed for Node.js',
    feedLinks: {
      rss2: `${siteUrl}/feed`,
      json: `${siteUrl}/feed.json`,
    },
    author,
  });

  items.forEach((item) => feed.addItem(item as Item));

  if (request.url.includes('json')) {
    return new Response(feed.json1(), {
      headers: { 'Content-Type': 'application/json' },
    });
  } else {
    return new Response(feed.rss2(), {
      headers: { 'Content-Type': 'application/rss+xml' },
    });
  }
}
