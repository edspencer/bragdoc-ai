import { SchemaWrapper } from './schema-wrapper';
import type { BlogPost } from '@/lib/blog';

interface BlogPostingSchemaProps {
  post: BlogPost;
}

export function BlogPostingSchema({ post }: BlogPostingSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: post.author || 'BragDoc Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'BragDoc',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.bragdoc.ai/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.bragdoc.ai/blog/${post.slug}`,
    },
  };

  return <SchemaWrapper schema={schema} />;
}
