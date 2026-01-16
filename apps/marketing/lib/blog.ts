import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  author?: string;
  tags?: string[];
  content: string;
  image?: string;
  excerpt?: string;
}

/**
 * Extract the first paragraph from MDX content, stripping MDX syntax
 */
function extractExcerpt(content: string): string {
  // Remove frontmatter if present (shouldn't be, but just in case)
  let text = content.replace(/^---[\s\S]*?---\s*/m, '');

  // Remove MDX components (e.g., <DemoCTA />, <ImageGallery ... />)
  text = text.replace(/<[A-Z][a-zA-Z]*[^>]*\/>/g, '');
  text = text.replace(/<[A-Z][a-zA-Z]*[^>]*>[\s\S]*?<\/[A-Z][a-zA-Z]*>/g, '');

  // Remove headings (lines starting with #)
  text = text.replace(/^#+\s+.*$/gm, '');

  // Remove images ![alt](src)
  text = text.replace(/!\[.*?\]\(.*?\)/g, '');

  // Remove links but keep text [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove bold/italic markers
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`[^`]+`/g, '');

  // Remove HTML/JSX style tags
  text = text.replace(/<[^>]+>/g, '');

  // Split into paragraphs (non-empty lines separated by blank lines)
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.startsWith('---'));

  // Get first 1-2 paragraphs, up to ~300 characters
  let excerpt = '';
  for (const para of paragraphs) {
    if (excerpt.length === 0) {
      excerpt = para;
    } else if (excerpt.length < 200) {
      excerpt += ` ${para}`;
    } else {
      break;
    }
  }

  // Trim to max length and add ellipsis if needed
  if (excerpt.length > 350) {
    excerpt = `${excerpt.slice(0, 347).trim()}...`;
  }

  return excerpt;
}

const postsDirectory = path.join(process.cwd(), 'content/blog');

export function getAllPosts(): BlogPost[] {
  // Get all .mdx files from the blog directory
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith('.mdx'))
    .map((fileName) => {
      // Remove ".mdx" from file name to get slug
      const slug = fileName.replace(/\.mdx$/, '');

      // Read markdown file as string
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');

      // Use gray-matter to parse the post metadata section
      const { data, content } = matter(fileContents);

      // Combine the data with the slug and content
      return {
        slug,
        title: data.title,
        date: data.date,
        description: data.description,
        author: data.author,
        tags: data.tags,
        content,
        image: data.image,
        excerpt: extractExcerpt(content),
      } as BlogPost;
    });

  // Sort posts by date (newest first)
  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.mdx`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    // Use gray-matter to parse the post metadata section
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title,
      date: data.date,
      description: data.description,
      author: data.author,
      tags: data.tags,
      content,
      image: data.image,
      excerpt: extractExcerpt(content),
    } as BlogPost;
  } catch (_error) {
    return null;
  }
}
