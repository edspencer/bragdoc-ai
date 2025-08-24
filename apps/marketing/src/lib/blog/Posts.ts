import path from 'node:path';
import fs from 'node:fs';
import matter, {stringify} from 'gray-matter';
import config from '../config';

export type Tag = {
  tag: string;
  count: number;
};

export type Post = {
  title: string;
  date: string;
  year: number;
  month: number;
  day: number;
  slug: string;
  tags: string[];
  status: string;
  relativeLink: string;
  link: string;
  excerptLength?: number;
  excerptSections?: number;
  related?: string[];
  description?: string;
  images?: string[];
  datetime?: string;
};

export const dirForExcerpt = (post: any) => path.join(process.cwd(), 'src', 'app', 'excerpts', String(post.year));
export const pathForExcerpt = (post: any) => path.join(dirForExcerpt(post), `${post.slug}.mdx`);
export const hasExcerpt = (post: any) => fs.existsSync(pathForExcerpt(post));

//returns an array of all .mdx files in a directory and its subdirectories
function findMdxFiles(dir: string, files: string[] = []) {
  try {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        findMdxFiles(fullPath, files);
      } else if (stats.isFile() && path.extname(fullPath) === '.mdx') {
        files.push(fullPath);
      }
    });
  } catch (error) {
    // Directory doesn't exist, return empty array
    console.warn(`Directory ${dir} not found, returning empty posts array`);
  }

  return files;
}

export const dirForPosts = path.join(process.cwd(), 'src', 'app', 'posts');
export const pathForPostFile = (post: any) => path.join(dirForPosts, String(post.year), `${post.slug}.mdx`);

export default class Posts {
  baseDirectory: string;
  allFiles: string[];
  allPosts: any[];
  publishedPosts: Post[];
  visiblePosts: Post[];

  constructor() {
    this.baseDirectory = path.join(dirForPosts);

    // console.time('Finding all .mdx files in the blog directory');
    this.allFiles = findMdxFiles(this.baseDirectory);
    // console.timeEnd('Finding all .mdx files in the blog directory');

    // console.time('Reading all .mdx files');
    this.allPosts = this.allFiles
      .map(file => {
        const source = fs.readFileSync(file);
        const { data } = matter(source);

        const postDate = new Date(data.date);
        data.year = postDate.getFullYear();
        data.month = postDate.getMonth() + 1;
        data.day = postDate.getDate();

        data.relativeLink = `/blog/${data.slug}`;
        data.link = `${config.siteUrl}/${data.relativeLink}`;

        return data;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    // console.timeEnd('Reading all .mdx files');

    this.publishedPosts = this.allPosts.filter(post => post.status === 'publish');
    if (process.env.NODE_ENV !== 'production') {
      this.visiblePosts = this.allPosts;
    } else {
      this.visiblePosts = this.publishedPosts;
    }
  }

  getPostsByTag(tag: string) {
    return this.visiblePosts.filter((post: any) => post.tags.includes(tag));
  }

  getTags(): string[] {
    const tags = new Set();
    this.visiblePosts.forEach((post: any) => {
      post.tags.forEach((tag: string) => {
        tags.add(tag);
      });
    });
    return Array.from(tags).map(tag => String(tag));
  }

  getTagsWithCounts(): Tag[] {
    const tags = this.getTags();
    const tagCounts: any = {};
    tags.forEach((tag: string) => {
      tagCounts[tag] = this.getPostsByTag(tag).length;
    });
    return Object.keys(tagCounts)
      .map((tag: string) => ({ tag, count: tagCounts[tag] }) as Tag)
      .sort((a, b) => b.count - a.count);
  }

  updateMatter(post: Post, updates: any) {
    const fileName = pathForPostFile(post);

    const content = fs.readFileSync(fileName, 'utf-8');
    const matterData = matter(content);

    matterData.data = {
      ...matterData.data,
      ...updates,
    };

    matterData.data.year = undefined;
    matterData.data.month = undefined;
    matterData.data.day = undefined;
    matterData.data.relativeLink = undefined;
    matterData.data.link = undefined;

    const newContent = stringify(matterData.content, matterData.data);

    fs.writeFileSync(fileName, newContent);
  }

  getContent(post: Post) {
    const source = fs.readFileSync(pathForPostFile(post));

    try {
      return matter(source).content;
    } catch (e) {
      console.error('Error reading post content for', post);
      console.error(e);
      return '';
    }
  }

  getRelatedPosts(post: Post) {
    const { visiblePosts } = this;
    const { tags, related = [] } = post;
    let relatedPosts: Post[] = [];

    if (related.length === 0) {
      //if no explicit related posts, find recent posts with the same tags
      relatedPosts = visiblePosts.filter(p => p.tags.some(t => tags.includes(t)) && p.slug !== post.slug);
    } else {
      relatedPosts = related.map(id => visiblePosts.find(p => p.slug === id)).filter(p => !!p);
    }

    return relatedPosts;
  }

  async getExcerpt(post: any) {
    if (!hasExcerpt(post)) {
      return null;
    }

    const excerptPath = pathForExcerpt(post);
    return fs.readFileSync(excerptPath, 'utf-8');
  }

  getLatestPosts(count: number) {
    return this.visiblePosts.slice(0, count);
  }
}
