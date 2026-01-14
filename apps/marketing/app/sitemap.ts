import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.bragdoc.ai';

  // Static pages with priority and change frequency
  const staticPages = [
    { url: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { url: '/features', priority: 0.9, changeFrequency: 'weekly' as const },
    {
      url: '/features/workstreams',
      priority: 0.8,
      changeFrequency: 'weekly' as const,
    },
    { url: '/pricing', priority: 0.9, changeFrequency: 'weekly' as const },
    { url: '/how-it-works', priority: 0.8, changeFrequency: 'weekly' as const },
    {
      url: '/why-it-matters',
      priority: 0.8,
      changeFrequency: 'weekly' as const,
    },
    { url: '/use-cases', priority: 0.8, changeFrequency: 'weekly' as const },
    { url: '/get-started', priority: 0.9, changeFrequency: 'weekly' as const },
    { url: '/about', priority: 0.7, changeFrequency: 'monthly' as const },
    { url: '/team', priority: 0.8, changeFrequency: 'monthly' as const },
    { url: '/cli', priority: 0.8, changeFrequency: 'weekly' as const },
    { url: '/faq', priority: 0.9, changeFrequency: 'weekly' as const },
    { url: '/privacy', priority: 0.6, changeFrequency: 'monthly' as const },
    {
      url: '/self-hosting',
      priority: 0.7,
      changeFrequency: 'monthly' as const,
    },
    { url: '/blog', priority: 0.7, changeFrequency: 'daily' as const },
  ].map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  // Blog posts (dynamic)
  const posts = getAllPosts();
  const blogPages = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...blogPages];
}
