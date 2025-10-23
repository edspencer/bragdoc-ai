# SEO Maintenance Guide

## Overview

This guide documents the SEO implementation for the BragDoc marketing site and provides instructions for maintaining and extending it.

## Current Implementation Status

### Metadata Coverage
- **13/13 pages** have unique, keyword-optimized metadata
- All pages include Open Graph and Twitter Card tags
- All pages have canonical URLs to prevent duplicate content

### Schema.org Structured Data
- **6 schema types** implemented:
  1. **OrganizationSchema** (homepage) - Company information
  2. **SoftwareApplicationSchema** (homepage) - App details and pricing
  3. **FAQSchema** (FAQ page) - 60+ question/answer pairs
  4. **BlogPostingSchema** (blog posts) - Article metadata
  5. **HowToSchema** (Get Started, How It Works) - Step-by-step guides
  6. **OfferSchema** (Pricing page) - Pricing information

### Technical SEO Infrastructure
- **robots.txt** - Search engine crawler directives
- **sitemap.xml** - Dynamically generated from `app/sitemap.ts`
- **Image optimization** - AVIF and WebP formats enabled
- **Canonical URLs** - Configured on all pages

### Performance Metrics
- **Lighthouse SEO Score**: 91-92/100 (target: 90+) ✅
- **Sitemap Coverage**: 15 URLs (13 static + 2 blog posts)
- **Schema Validation**: All 6 types render correctly

---

## Adding Metadata to New Pages

### Step 1: Export Metadata Object

Add a metadata export at the top of your page file:

```typescript
// apps/marketing/app/new-page/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Title - BragDoc',
  description: 'Compelling 150-160 character description with target keywords',
  keywords: 'keyword1, keyword2, keyword3',
  alternates: {
    canonical: '/new-page',
  },
  openGraph: {
    title: 'Social Share Title',
    description: 'Social description',
    type: 'website',
    url: 'https://www.bragdoc.ai/new-page',
    siteName: 'BragDoc',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Twitter Title',
    description: 'Twitter description',
  },
};

export default function NewPage() {
  return <div>Page content</div>;
}
```

### Step 2: Metadata Best Practices

**Title Tag:**
- Length: 50-60 characters (including " - BragDoc")
- Include primary keyword near the beginning
- Unique for every page
- Format: "Primary Keyword: Secondary Keywords - BragDoc"

**Meta Description:**
- Length: 150-160 characters
- Compelling and actionable
- Include 1-2 target keywords naturally
- Unique for every page
- Should entice clicks from search results

**Keywords:**
- 3-5 relevant keywords or phrases
- Focus on what users might search for
- Don't stuff keywords - use natural language

**Open Graph:**
- Title can be slightly different from page title (more conversational)
- Description should work well for social sharing
- Always include siteName: 'BragDoc'
- Add images property with og-image path when available

### Step 3: Add to Sitemap

Edit `apps/marketing/app/sitemap.ts` and add your page to the `staticPages` array:

```typescript
const staticPages = [
  // ... existing pages
  {
    url: '/new-page',
    priority: 0.8, // Adjust based on importance
    changeFrequency: 'weekly' as const,
  },
];
```

**Priority Guidelines:**
- 1.0 - Homepage only
- 0.9 - Key pages (Features, Pricing, Get Started, FAQ)
- 0.8 - Important pages (How It Works, Use Cases, CLI)
- 0.7 - Secondary pages (About, Blog index, Self-hosting)
- 0.6 - Tertiary pages (Privacy, individual blog posts)

**Change Frequency Guidelines:**
- `daily` - Blog index
- `weekly` - Homepage, key feature pages
- `monthly` - About, Privacy, secondary pages

---

## Adding Schema Markup

### Step 1: Choose Schema Type

Determine if your content matches a schema.org type:
- **FAQPage** - Multiple Q&A pairs
- **HowTo** - Step-by-step instructions
- **Article/BlogPosting** - Blog posts, articles
- **Offer/Product** - Pricing, product details
- **Organization** - Company information
- **SoftwareApplication** - App/software details

### Step 2: Create Schema Component (if needed)

If creating a new schema type, follow this pattern:

```typescript
// apps/marketing/components/structured-data/new-schema.tsx
import { SchemaWrapper } from './schema-wrapper';

interface NewSchemaProps {
  // Define props based on schema requirements
  title: string;
  description: string;
}

export function NewSchema({ title, description }: NewSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SchemaType', // e.g., 'Article', 'Event', etc.
    name: title,
    description: description,
    // ... other required fields
  };

  return <SchemaWrapper schema={schema} />;
}
```

### Step 3: Add Schema to Page

Import and render the schema component in your page:

```typescript
import { NewSchema } from '@/components/structured-data/new-schema';

export default function Page() {
  return (
    <>
      <NewSchema title="Example" description="Description" />
      {/* Page content */}
    </>
  );
}
```

### Step 4: Validate Schema

1. **Run dev server**: `pnpm dev`
2. **View page source**: Right-click → View Page Source
3. **Find JSON-LD**: Search for `application/ld+json`
4. **Copy schema JSON**: Copy the entire JSON object
5. **Test with Google**: https://search.google.com/test/rich-results
6. **Fix errors**: Address any errors or warnings
7. **Re-test**: Validate until no errors remain

---

## Sitemap Maintenance

### Automatic Updates

The sitemap is **automatically generated** from:
- Static pages array in `apps/marketing/app/sitemap.ts`
- Dynamic blog posts from `lib/blog.ts`

No manual sitemap editing required! Just add pages to the static array.

### Sitemap Structure

```typescript
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.bragdoc.ai';

  const staticPages = [
    { url: '', priority: 1.0, changeFrequency: 'weekly' },
    // Add new pages here
  ].map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  // Blog posts automatically included
  const posts = getAllPosts();
  const blogPages = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticPages, ...blogPages];
}
```

### Testing Sitemap

```bash
# Start dev server
pnpm dev

# Visit sitemap
open http://localhost:3000/sitemap.xml

# Check for:
# - All expected URLs present
# - Valid XML structure
# - Correct priorities and change frequencies
```

---

## robots.txt Maintenance

### Current Configuration

**File**: `apps/marketing/public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/
Sitemap: https://www.bragdoc.ai/sitemap.xml
Crawl-delay: 1
```

### When to Update

**Add Disallow rules** if you add:
- Private admin pages
- Internal testing pages
- Staging/preview pages
- Pages with sensitive data

**Update Sitemap URL** if:
- Domain changes
- Multiple sitemaps needed

### Testing robots.txt

```bash
# Start dev server
pnpm dev

# Visit robots.txt
open http://localhost:3000/robots.txt

# Verify:
# - File is accessible
# - Sitemap URL is correct
# - Disallow rules are complete
```

---

## Testing Procedures

### Before Every Deployment

1. **Build the site**:
   ```bash
   cd apps/marketing
   pnpm build
   ```

2. **Start production server**:
   ```bash
   pnpm start
   ```

3. **Run Lighthouse audits** on key pages:
   - Homepage: `http://localhost:3000`
   - Features: `http://localhost:3000/features`
   - Blog post: `http://localhost:3000/blog/[slug]`

4. **Check Lighthouse scores**:
   - SEO: Must be 90+ (target: 95+)
   - Performance: 80+ mobile, 90+ desktop
   - Accessibility: 90+
   - Best Practices: 90+

5. **Validate all schema types**:
   - Copy JSON-LD from page source
   - Test at https://search.google.com/test/rich-results
   - Fix any errors or warnings

6. **Verify sitemap**:
   - Visit `/sitemap.xml`
   - Confirm all pages present
   - Check XML is valid (no errors in browser)

7. **Test robots.txt**:
   - Visit `/robots.txt`
   - Confirm sitemap URL is correct
   - Verify disallow rules

### For New Pages

1. **Metadata check**:
   - View page source
   - Confirm title tag is unique
   - Verify meta description present
   - Check Open Graph tags
   - Verify canonical URL

2. **Schema validation** (if applicable):
   - View page source
   - Copy JSON-LD schema
   - Test with Google Rich Results Test
   - Fix any errors

3. **Lighthouse audit**:
   - Run Lighthouse on new page
   - Must achieve SEO score 90+
   - Fix any issues

---

## Google Search Console Monitoring

### Initial Setup (Production Only)

1. **Add property**: https://search.google.com/search-console
2. **Choose domain**: `www.bragdoc.ai`
3. **Verify ownership**: DNS TXT record or HTML file upload
4. **Submit sitemap**: Settings → Sitemaps → Add sitemap URL: `https://www.bragdoc.ai/sitemap.xml`

### Weekly Monitoring

Check these metrics in Google Search Console:

**Performance Tab:**
- Total clicks (trending up?)
- Total impressions (trending up?)
- Average CTR (>2% is good)
- Average position (lower is better)
- Top queries (are target keywords ranking?)

**Coverage Tab:**
- Indexed pages vs. total pages
- Any errors or warnings?
- Pages excluded by robots.txt (should only be /_next/, /api/)

**Enhancements Tab:**
- Core Web Vitals (all "Good" URLs)
- Mobile usability (no errors)
- Rich results (all valid)

### Monthly Tasks

1. **Review search queries**:
   - Identify new keyword opportunities
   - Update metadata for pages with low CTR
   - Create content for high-volume queries not ranking

2. **Check rich results**:
   - Verify FAQ, HowTo, Product schemas still valid
   - Fix any schema errors or warnings

3. **Analyze page performance**:
   - Which pages get most traffic?
   - Which pages have high impressions but low clicks? (improve meta description)
   - Which pages have dropped in ranking? (update content)

---

## SEO Tools & Resources

### Testing Tools

- **Lighthouse**: Built into Chrome DevTools (Cmd+Option+I → Lighthouse)
- **Google Rich Results Test**: https://search.google.com/test/rich-results
- **PageSpeed Insights**: https://pagespeed.web.dev/
- **Google Search Console**: https://search.google.com/search-console
- **Mobile-Friendly Test**: https://search.google.com/test/mobile-friendly

### Schema.org Resources

- **Schema.org Documentation**: https://schema.org/
- **JSON-LD Playground**: https://json-ld.org/playground/
- **Google Schema Guidelines**: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data

### Learning Resources

- **Google SEO Starter Guide**: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- **Next.js Metadata Docs**: https://nextjs.org/docs/app/building-your-application/optimizing/metadata
- **Web.dev SEO**: https://web.dev/learn/seo/

---

## Common Issues & Solutions

### Issue: Metadata Not Showing in Search Results

**Cause**: Google hasn't crawled the page yet, or metadata is poorly formatted.

**Solution**:
1. Submit sitemap to Google Search Console
2. Request indexing for specific page
3. Wait 1-2 weeks for Google to crawl
4. Verify metadata is unique and compelling

### Issue: Schema Errors in Rich Results Test

**Cause**: Missing required fields or incorrect field types.

**Solution**:
1. Copy error message from test results
2. Review schema.org documentation for that type
3. Add missing required fields
4. Fix field types (string vs number vs date)
5. Re-test until valid

### Issue: Page Not in Sitemap

**Cause**: Forgot to add page to `staticPages` array in `sitemap.ts`.

**Solution**:
1. Edit `apps/marketing/app/sitemap.ts`
2. Add page to `staticPages` array with priority and changeFrequency
3. Rebuild site: `pnpm build`
4. Verify at `/sitemap.xml`

### Issue: Low Lighthouse SEO Score

**Common causes**:
- Missing meta description
- Duplicate title tags
- No canonical URL
- Images without alt text
- Broken internal links

**Solution**:
1. Run Lighthouse audit
2. Read specific failures in report
3. Fix each issue one at a time
4. Re-run audit to verify fixes

### Issue: robots.txt Blocking Important Pages

**Cause**: Overly broad Disallow rules.

**Solution**:
1. Review `apps/marketing/public/robots.txt`
2. Remove or narrow Disallow rules
3. Test with Google Search Console URL Inspection
4. Submit for re-indexing if needed

---

## Changelog

### 2025-10-23: Initial SEO Implementation
- Added unique metadata to all 13 pages
- Implemented 6 schema.org types (Organization, SoftwareApplication, FAQ, BlogPosting, HowTo, Offer)
- Created dynamic sitemap generation
- Added robots.txt
- Enabled Next.js image optimization
- Achieved 91-92 Lighthouse SEO scores

---

## Contact & Support

For questions about SEO implementation or issues with this guide:
- Review technical documentation in `.claude/docs/tech/frontend-patterns.md`
- Check Next.js documentation: https://nextjs.org/docs
- Consult documentation-manager agent for updates to this guide
