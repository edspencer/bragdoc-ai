import Link from 'next/link';
import type { Tag } from '@/lib/blog/Posts';

export function PostTagLink({ tag }: { tag: string }) {
  return (
    <Link
      href={`/blog/tag/${tag}`}
      className="relative z-10 rounded-full bg-gray-50 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100 no-underline text-xs sm:text-base"
    >
      {tag}
    </Link>
  );
}

export function PostTags({ post }: { post: any }) {
  return (
    <div className="tags flex flex-row flex-wrap gap-2">
      {post.tags.map((tag: string) => (
        <PostTagLink key={tag} tag={tag} />
      ))}
    </div>
  );
}

export function TagCloud({ tags }: { tags: Tag[] }) {
  return (
    <div className="flex flex-wrap">
      {tags.map((tag) => (
        <TagCloudLink key={tag.tag} tag={tag} />
      ))}
    </div>
  );
}

export function TagCloudLink({ tag }: { tag: Tag }) {
  return (
    <Link
      href={`/blog/tag/${tag.tag}`}
      className="inline-block rounded-full px-3 py-1 text-sm font-semibold text-gray-700 m-2 no-underline"
    >
      {tag.tag}
      <span className="bg-gray-200 rounded-full px-2 py-1 text-xs font-bold text-gray-700 ml-2">
        {tag.count}
      </span>
    </Link>
  );
}
