# SEO Patterns (Marketing Site)

The marketing site (`apps/marketing/`) implements comprehensive SEO patterns for search engine visibility and rich search results.

## Page Metadata Pattern

**Location**: Any page file (e.g., `apps/marketing/app/page.tsx`)

All marketing pages should export a `metadata` object with unique, keyword-optimized content:

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Title - BragDoc',
  description: 'Compelling 150-160 character description with target keywords',
  keywords: 'keyword1, keyword2, keyword3',
  alternates: {
    canonical: '/page-path',
  },
  openGraph: {
    title: 'Social Share Title',
    description: 'Social share description',
    type: 'website',
    url: 'https://www.bragdoc.ai/page-path',
    siteName: 'BragDoc',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Twitter Card Title',
    description: 'Twitter card description',
  },
};
```

**Key Requirements**:
- **Title**: Unique per page, 50-60 characters, include primary keyword
- **Description**: Unique per page, 150-160 characters, compelling and keyword-rich
- **Keywords**: 3-5 relevant keywords or phrases
- **Canonical URL**: Prevents duplicate content issues
- **Open Graph**: Improves social media sharing previews
- **Twitter Card**: Optimizes Twitter sharing display

## Dynamic Metadata Pattern (Blog Posts)

**Location**: `apps/marketing/app/blog/[slug]/page.tsx`

Use `generateMetadata` for dynamic content:

```typescript
import type { Metadata } from 'next';
import { getPostBySlug } from '@/lib/blog';

export async function generateMetadata({
  params
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return {
      title: 'Post Not Found - BragDoc Blog',
    };
  }

  return {
    title: `${post.title} | BragDoc Blog`,
    description: post.description,
    keywords: post.tags?.join(', '),
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: post.author ? [post.author] : undefined,
      url: `https://www.bragdoc.ai/blog/${post.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}
```

## Schema.org Structured Data Pattern

**Location**: `apps/marketing/components/structured-data/`

All schema components use a common wrapper for consistent JSON-LD output:

**Base Component** (`schema-wrapper.tsx`):
```typescript
interface SchemaWrapperProps {
  schema: object;
}

export function SchemaWrapper({ schema }: SchemaWrapperProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

**Schema Component Example** (`faq-schema.tsx`):
```typescript
import { SchemaWrapper } from './schema-wrapper';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  faqs: FAQItem[];
}

export function FAQSchema({ faqs }: FAQSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return <SchemaWrapper schema={schema} />;
}
```

**Usage in Page**:
```typescript
import { FAQSchema } from '@/components/structured-data/faq-schema';
import { faqData } from '@/lib/faq-data';

export default function FaqPage() {
  // Flatten all FAQ categories into single array
  const allQuestions = faqData.flatMap(category => category.questions);

  return (
    <div>
      <FAQSchema faqs={allQuestions} />
      {/* Page content */}
    </div>
  );
}
```

## Available Schema Types

**Organization Schema** (`organization-schema.tsx`):
- Company information
- Logo, URL, description
- Use on homepage

**SoftwareApplication Schema** (`software-application-schema.tsx`):
- App details, pricing, platform support
- Aggregate ratings
- Use on homepage

**FAQSchema** (`faq-schema.tsx`):
- Question/Answer pairs
- Rich snippet eligible
- Use on FAQ page

**BlogPosting Schema** (`blog-posting-schema.tsx`):
- Article metadata, author, dates
- Publisher information
- Use on all blog posts

**HowTo Schema** (`how-to-schema.tsx`):
- Step-by-step instructions
- Rich snippet eligible
- Use on tutorial/guide pages

**Offer Schema** (`offer-schema.tsx`):
- Pricing information
- Product details
- Use on pricing page

## Sitemap Pattern

**Location**: `apps/marketing/app/sitemap.ts`

Dynamic sitemap generation using Next.js App Router:

```typescript
import { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.bragdoc.ai';

  // Static pages with priorities
  const staticPages = [
    { url: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { url: '/features', priority: 0.9, changeFrequency: 'weekly' as const },
    // ... more pages
  ].map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  // Dynamic blog posts
  const posts = getAllPosts();
  const blogPages = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...blogPages];
}
```

**Sitemap automatically generates**:
- Accessible at `/sitemap.xml`
- Includes all static and dynamic pages
- Referenced in `robots.txt`

## Robots.txt Pattern

**Location**: `apps/marketing/public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/
Sitemap: https://www.bragdoc.ai/sitemap.xml
Crawl-delay: 1
```

## Image Optimization for SEO

**Configuration**: `apps/marketing/next.config.mjs`

```javascript
images: {
  unoptimized: false,
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
}
```

**Best Practices**:
- Use Next.js `<Image>` component for automatic optimization
- Provide descriptive `alt` text with keywords
- Use meaningful file names (not `image-1.png`)
- Lazy load images by default (Next.js handles this)

## SEO Checklist for New Pages

When adding a new page to the marketing site:

1. **Add unique metadata** using the metadata pattern above
2. **Add to sitemap** in `apps/marketing/app/sitemap.ts` static pages array
3. **Add canonical URL** with `alternates.canonical`
4. **Include Open Graph tags** for social sharing
5. **Add schema markup** if page matches a schema type (FAQ, HowTo, etc.)
6. **Optimize images** with descriptive alt text
7. **Test with Lighthouse** (target: SEO 90+)
8. **Validate schema** with Google Rich Results Test

## SEO Architecture (Marketing Site)

### Technical SEO Infrastructure

The marketing site (`apps/marketing/`) implements comprehensive SEO optimizations for organic search visibility.

### Metadata Management
- **Unique Metadata**: All 13 pages have unique title, description, and keywords
- **Open Graph Tags**: Social sharing previews for Twitter, Facebook, LinkedIn
- **Canonical URLs**: Prevent duplicate content issues with `alternates.canonical`
- **metadataBase**: Configured in root layout for absolute URL generation

**Pattern:**
```typescript
// app/[page]/page.tsx
export const metadata: Metadata = {
  title: 'Page Title - BragDoc',
  description: 'Compelling description with keywords',
  keywords: 'keyword1, keyword2, keyword3',
  alternates: {
    canonical: '/page-path',
  },
  openGraph: {
    title: 'Social Share Title',
    description: 'Social description',
    type: 'website',
    url: 'https://www.bragdoc.ai/page-path',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Twitter Title',
    description: 'Twitter description',
  },
};
```

### Schema.org Structured Data

**Location:** `apps/marketing/components/structured-data/`

**Components:**
- `schema-wrapper.tsx` - Base component for all schema markup
- `organization-schema.tsx` - Company information (homepage)
- `software-application-schema.tsx` - App details and pricing (homepage)
- `faq-schema.tsx` - FAQ rich snippets (FAQ page)
- `blog-posting-schema.tsx` - Article metadata (blog posts)
- `how-to-schema.tsx` - Step-by-step guides (Get Started, How It Works)
- `offer-schema.tsx` - Pricing information (Pricing page)

**Usage:**
```typescript
import { FAQSchema } from '@/components/structured-data/faq-schema';

export default function FaqPage() {
  return (
    <>
      <FAQSchema faqs={faqData} />
      {/* Page content */}
    </>
  );
}
```

### Sitemap Generation

**File:** `apps/marketing/app/sitemap.ts`

- **Static Pages**: All 13 marketing pages with priorities (0.6-1.0)
- **Dynamic Pages**: Blog posts automatically included from `lib/blog.ts`
- **Change Frequency**: Configured per page type
- **Last Modified**: Dynamic dates from content

**Sitemap Structure:**
```typescript
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.bragdoc.ai',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    // ... other pages
  ];
}
```

### Robots.txt

**File:** `apps/marketing/public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/
Sitemap: https://www.bragdoc.ai/sitemap.xml
Crawl-delay: 1
```

### Image Optimization

**Configuration:** `apps/marketing/next.config.mjs`

```javascript
images: {
  unoptimized: false,
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
}
```

**Features:**
- AVIF and WebP format generation
- Responsive image sizes
- Lazy loading by default
- Automatic optimization in production

### SEO Performance Metrics

**Lighthouse Scores (Development):**
- SEO: 91-92/100 (target: 90+)
- Performance: 76-92/100
- Accessibility: 89-100/100
- Best Practices: 96/100

**Sitemap Coverage:**
- Static pages: 13
- Dynamic blog posts: 2+ (grows with content)
- Total: 15+ indexed URLs


## SEO Testing

**Tools**:
- **Lighthouse**: Built into Chrome DevTools (Cmd+Option+I → Lighthouse tab)
- **Google Rich Results Test**: https://search.google.com/test/rich-results
- **PageSpeed Insights**: https://pagespeed.web.dev/

**Targets**:
- SEO Score: 90+ (Lighthouse)
- Performance: 80+ mobile, 90+ desktop
- Accessibility: 90+
- Schema: No errors or warnings

## Open Graph Images

**Location**: `apps/marketing/lib/og-image.tsx` (shared component)

Dynamic OG image generation using `@vercel/og`:

```typescript
import { createOGImage, ogImageSize } from '@/lib/og-image';

export const runtime = 'edge';
export const alt = 'Page Title - BragDoc';
export const size = ogImageSize;
export const contentType = 'image/png';

export default async function Image() {
  return createOGImage({
    title: 'Page Title',
    subtitle: 'Optional subtitle',
    badges: ['Feature 1', 'Feature 2', 'Feature 3'],
  });
}
```

**Pattern**:
- Create `opengraph-image.tsx` in the page directory
- Use shared `createOGImage()` function for consistency
- Supports `title`, `subtitle`, `badges`, `items`, and custom `children`
- Automatically detected by Next.js (no manual metadata config needed)

---

**Last Updated:** 2025-10-23 (SEO patterns documentation)
