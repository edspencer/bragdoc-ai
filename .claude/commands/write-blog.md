---
allowed-tools: Bash, Edit, Glob, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [topic]
description: Create a blog post according to blog-rules.md
---

# Create a blog post

Your task is to create a blog post on the given topic following blog-rules.md guidelines.

## Data you have access to

### Topic (argument 1)

The topic argument ($1) provides the blog post subject. This may include:

- Topic or theme
- Target audience
- Key points to cover
- Any specific requirements or constraints

## Technical Docs

All technical docs are in `.claude/docs/tech/`. You are expected to be an expert with all aspects of the product and the codebase. Any time you write about a given topic, you should first check to see if it is covered in the technical docs. If it is, you should use the technical docs as the source of truth.

## Your Task

Create a comprehensive blog post in `apps/marketing/content/blog/[slug].mdx` that follows our brand voice and technical standards.

### Blog Requirements

IMPORTANT: All blog posts must follow the guidelines in `.claude/docs/processes/blog-rules.md`. Read that file carefully.

**Key Requirements:**

1. **Tone**: Proud but not boastful, happy but not hard-sell, humble and service-focused
2. **Style**: No emojis
3. **Format**: MDX format with proper frontmatter
4. **Location**: `apps/marketing/content/blog/[slug].mdx`

### Research Phase

Before writing:

1. Research existing blog content in `apps/marketing/content/blog/` for consistency
2. Review similar topics we've covered
3. Understand our brand voice from existing posts
4. Check technical documentation in `.claude/docs/tech/` for accuracy

### Content Structure

Create blog posts with:

- **Frontmatter**: title, description, date, author, tags
- **Introduction**: Hook readers and set context
- **Body**: Well-organized sections with clear headings
- **Conclusion**: Actionable takeaways or next steps
- **Technical accuracy**: Verify all technical claims and code examples

### SEO Considerations

- Choose descriptive, keyword-rich titles
- Write compelling meta descriptions
- Use proper heading hierarchy (H1, H2, H3)
- Include relevant internal and external links
- Optimize for readability (short paragraphs, bullet points)

### Slug Generation

Create URL-friendly slugs:

- Use lowercase with hyphens
- Keep it concise (3-6 words ideal)
- Include primary keyword
- Example: `tracking-achievements-cli`

## Gather Requirements

If the topic ($1) needs clarification:

- Ask about target audience
- Understand key messages to convey
- Identify any technical features to highlight
- Confirm tone and style preferences

# Get started

Please research existing content and create the blog post.
