# Blog rules

## Tone

- We're proud of our product, but not boastful or smug about it. Write in a happy tone, but you're not trying the hard sell or to convince anyone how great we are; we're here to serve our customers as humbly and as best we can.
- Our users are busy, so write in a concise and engaging way. Don't use long paragraphs or complex sentences. Don't repeat yourself or gush.
- We genuinely love doing this, and we're genuinely looking to provide as much value to as many users as possible. Our product is priced really cheap so you don't need to sell it or try to convince people how great it is - that said, if people are reading our content then it's because they want to learn about our product and use it, so we're not trying to hide our work either!

## Good examples

- https://www.anthropic.com/news/claude-sonnet-4-5 - This is a great example of a blog post that has a strong blend of text and images (5 images and 3 inline videos!). The paragraph lengths are about right and have good captions that match the overall story. Headlines are short and informative, with each section of the post having a headline and only a few paragraphs of text.

## Formatting

- Use markdown for formatting
- Don't use emojis
- Most posts should be in the region of 500-1000 words, but it's ok to occasionally go longer if the post is still engaging and concise
- Break up text into sections with headlines - each section should be about a single idea and will typically contain anything from 3-8 paragraphs of text
- Break any of these rules if it will make the post better or follow specific instructions better

## Images

- Every blog post should have at least one image
- Screenshots of the application in various states make excellent images for blog posts, especially if it can illustrate a feature of the product that the post is about
- We should use the @agent-screenshotter agent to create screenshots of the application
- The @agent-screenshotter agent can create screenshots of the mobile view of the app as well as the desktop view
- The @agent-screenshotter can also generate images of terminal commands - this should be used to show CLI features where an image of that would be helpful

## SEO considerations

### Titles and Headlines

- Titles should be 50-60 characters to display properly in search results
- Include primary keyword naturally in the title, preferably near the beginning
- Make titles compelling and click-worthy while accurately representing content
- Use H1 for the main title (only one per page), H2 for major sections, H3 for subsections

### Content Structure

- Front-load important information in the first 100-150 words
- Use short paragraphs (2-4 sentences) for better readability and mobile experience
- Include the primary keyword in the first paragraph naturally
- Break content into scannable sections with descriptive subheadings
- Use bullet points and numbered lists where appropriate

### Keywords and Semantic SEO

- Focus on one primary keyword per post, with 2-3 related secondary keywords
- Use keywords naturally - never force or stuff them
- Include semantic variations and related terms (e.g., "brag document," "work achievements," "career tracking")
- Target long-tail keywords that match user intent (e.g., "how to track work achievements" vs. "work tracking")

### Meta Elements

- Write unique meta descriptions (150-160 characters) that include the primary keyword
- Meta descriptions should be compelling and encourage clicks
- Ensure each post has a unique, descriptive URL slug using hyphens (e.g., `/blog/how-to-write-brag-document`)

### Internal and External Links

- Link to 2-4 relevant internal pages (other blog posts, product pages, documentation)
- Use descriptive anchor text that indicates what the linked page is about
- Include 1-2 authoritative external links to credible sources when relevant
- Ensure all links open in appropriate contexts (external links in new tabs if it improves UX)

### Images and Media

- Use descriptive, keyword-rich file names (e.g., `brag-document-example.png` not `screenshot-1.png`)
- Always include alt text that describes the image and includes keywords when natural
- Compress images to maintain fast page load times (aim for under 200KB per image)
- Use modern formats like WebP when possible

### Technical SEO

- Aim for page load times under 3 seconds
- Ensure mobile responsiveness (Google uses mobile-first indexing)
- Use schema markup for articles (JSON-LD format)
- Include publish date and last modified date
- Ensure proper heading hierarchy (don't skip levels)

### Content Quality Signals

- Aim for comprehensive coverage of the topic (typically 800-2000 words for pillar content)
- Update older posts periodically to keep them fresh and relevant
- Include original insights, examples, or data when possible
- Answer common questions users might have about the topic
- Write for humans first, search engines second - engagement metrics matter

### User Experience Signals

- Keep bounce rate low with engaging, relevant content
- Encourage time on page with valuable, well-structured content
- Include clear calls-to-action that align with user intent
- Ensure fast, smooth navigation and interaction
