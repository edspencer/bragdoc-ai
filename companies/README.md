# Company Performance Review Research

This directory contains research on how various companies conduct performance reviews, with a focus on software engineers.

## Purpose

This research serves multiple purposes:

1. **Blog Content**: Source material for blog posts about performance reviews
2. **Product Development**: Understanding real-world review formats to improve BragDoc's performance review features
3. **User Guidance**: Helping users prepare for reviews at their specific company

## Structure

Each company has its own directory:

```
companies/
├── google/
│   └── performance-review.md
├── meta/
│   └── performance-review.md
├── amazon/
│   └── performance-review.md
└── ...
```

## Generating Research

Use the `/research-company-reviews` skill to research a new company:

```bash
/research-company-reviews Google
/research-company-reviews Meta
/research-company-reviews Stripe
```

The skill will:
1. Search multiple sources (Taro, TeamRora, Promotions.fyi, Blind, etc.)
2. Compile findings into a structured document
3. Save to `companies/[company-slug]/performance-review.md`

## Document Structure

Each performance review document includes:

- **Overview**: System name, frequency, timing
- **Self-Review**: Questions, format, character limits
- **Evaluation Axes**: Dimensions engineers are rated on
- **Peer Feedback**: Format, questions, limits
- **Calibration**: Rating process and scale
- **Tips**: Advice for success
- **Sources**: URLs for all information

## Confidence Levels

Each document has a confidence level:

- **High**: Multiple corroborating sources, recent information
- **Medium**: Some sources, may have gaps
- **Low**: Limited public information available

## Contributing

When adding or updating research:

1. Always cite sources with URLs
2. Note the research date
3. Be explicit about what couldn't be found
4. Distinguish fact from coaching advice
5. Update the confidence level based on source quality

## Related

- Blog posts: `apps/marketing/content/blog/`
- GitHub Issue #333: Comparison blog post
