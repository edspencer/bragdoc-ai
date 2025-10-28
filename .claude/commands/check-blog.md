---
allowed-tools: Bash, Glob, Grep, Read
argument-hint: [blog-file]
description: Validate a blog post against blog-rules.md
---

# Check a blog post against rules

Your task is to validate a blog post file ($1) against blog-rules.md and provide comprehensive feedback on SEO, readability, brand voice, and technical accuracy.

## Your Task

Read the blog post and validate it against `.claude/docs/processes/blog-rules.md` and our established content standards. This is a read-only validation task - do not modify the blog file.

### Validation Checklist

Check the following aspects:

**File Format and Location:**
- [ ] File is in `apps/marketing/content/blog/[slug].mdx` format
- [ ] Slug is URL-friendly (lowercase, hyphens, concise)
- [ ] File uses MDX format correctly

**Frontmatter:**
- [ ] Has title, description, date, author
- [ ] Title is descriptive and keyword-rich
- [ ] Description is compelling (150-160 characters ideal)
- [ ] Date format is correct
- [ ] Tags are relevant and consistent with existing posts

**Brand Voice (blog-rules.md):**
- [ ] Tone is proud but not boastful
- [ ] Happy tone without hard-sell language
- [ ] Humble and service-focused
- [ ] No emojis used

**Content Quality:**
- [ ] Clear introduction that hooks readers
- [ ] Well-organized body with logical flow
- [ ] Proper heading hierarchy (H1, H2, H3)
- [ ] Short, readable paragraphs
- [ ] Actionable conclusion or next steps
- [ ] Uses bullet points and lists where appropriate

**SEO:**
- [ ] Title optimized for search (60 characters or less ideal)
- [ ] Meta description compelling and keyword-rich
- [ ] Internal links to relevant pages
- [ ] External links to authoritative sources
- [ ] Images have descriptive alt text (if applicable)
- [ ] Proper use of keywords without stuffing

**Technical Accuracy:**
- [ ] All technical claims are verifiable
- [ ] Code examples are correct and tested
- [ ] Feature descriptions match actual functionality
- [ ] Links to documentation are accurate
- [ ] No outdated information

**Readability:**
- [ ] Flesch reading ease score acceptable (aim for 60+)
- [ ] Average sentence length reasonable (15-20 words)
- [ ] Active voice preferred over passive
- [ ] Technical jargon explained or avoided
- [ ] Clear, concise language

## Output Format

Provide a structured validation report:

### Validation Summary
- Overall assessment (Pass / Pass with suggestions / Needs revision)
- Readability score estimate
- Number of critical issues
- Number of suggestions

### Critical Issues
List any violations of blog-rules.md or major problems that must be fixed.

### SEO Feedback
- Title effectiveness
- Meta description quality
- Keyword usage
- Link strategy
- Structural improvements

### Content Suggestions
- Voice and tone adjustments
- Readability improvements
- Structural recommendations
- Technical accuracy concerns

### Positive Observations
Note what the blog post does well.

## Next Steps

If there are critical issues, recommend revisions before publishing.
If the post passes validation, confirm it's ready for publication.
