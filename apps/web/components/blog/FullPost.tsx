import { PostTags } from 'components/blog/Tag';
import Posts, { pathForPostFile } from 'lib/blog/Posts';

import Link from 'next/link';
import { ShareOnSocialMedia } from './Share';
import MarkdownContent from './MarkdownContent';
import Divider from './Divider';

import fs from 'node:fs';
import matter from 'gray-matter';

export function formatDate(dateString: string) {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

export function FullPost({
  post,
  sidebar = true,
}: {
  post: any;
  sidebar?: boolean;
}) {
  return (
    <div className="py-0 lg:py-8">
      <div className="mx-auto max-w-6xl lg:max-w-7xl text-base leading-7 text-gray-700 dark:text-gray-300 lg:grid lg:grid-cols-2 lg:grid-flow-col lg:gap-2 xl:gap-8">
        <div className="blog-post col-span-3">
          <h1 className="dark:text-gray-100">
            <Link href={post.relativeLink}>{post.title}</Link>
          </h1>
          {post.date && (
            <div className="my-4 text-gray-600 dark:text-gray-400">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </div>
          )}
          <PostBody post={post} />
          <ShareOnSocialMedia url={post.link} className="mt-12 mb-8" />
          <Divider />
        </div>
      </div>
    </div>
  );
}

export function PostTeaser({ post }: { post: any }) {
  return (
    <div className="blog-post mb-24">
      <div className="mx-auto text-base leading-7 text-gray-700 dark:text-gray-300">
        <h1 className="dark:text-gray-100">
          <Link href={post.relativeLink}>{post.title}</Link>
        </h1>
        {post.date && (
          <div className="my-4 text-gray-600 dark:text-gray-400">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
        )}
        <PostTags post={post} />
        <PostExcerpt post={post} />
        <Link
          href={post.relativeLink}
          className="font-semibold leading-6 text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Continue reading <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

export async function PostExcerpt({ post }: { post: any }) {
  const posts = new Posts();
  const excerpt = await posts.getExcerpt(post);

  if (!excerpt) {
    return null;
  }

  return (
    <div className="body">
      <MarkdownContent content={excerpt} />
    </div>
  );
}

export async function PostBody({
  post,
  excerpt = false,
}: {
  post: any;
  excerpt?: boolean;
}) {
  return (
    <div className="body dark:text-gray-300">
      <PostContent post={post} />
    </div>
  );
}

export async function PostContent({ post }: { post: any }) {
  const postFilePath = pathForPostFile(post);
  const source = fs.readFileSync(postFilePath);
  const { content } = matter(source);

  return <MarkdownContent content={content} />;
}
