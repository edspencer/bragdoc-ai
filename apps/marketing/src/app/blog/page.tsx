import Posts, { type Post } from '@/lib/blog/Posts';
import { TagCloud } from '@/components/blog/Tag';
import Link from 'next/link';
import { PostTeaser } from '@/components/blog/FullPost';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon } from 'lucide-react';

export default function Blog() {
  const { visiblePosts } = new Posts();
  const recentPosts = visiblePosts.filter(
    (post) => new Date(post.date).getFullYear() > 2019,
  );

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl text-base leading-7 text-foreground/80">
        <div className="my-4">
          <Categories />
          <CompactCTA />
          <RecentPosts posts={recentPosts} />
          <h1 className="text-3xl mb-4 text-foreground">All Posts by Tag</h1>
          <TagCloud tags={new Posts().getTagsWithCounts()} />
        </div>
      </div>
    </div>
  );
}

function CompactCTA() {
  return (
    <div className="mb-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            Ready to start tracking your achievements?
          </h3>
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
            Join thousands of professionals using bragdoc.ai
          </p>
        </div>
        <Button asChild variant="default" size="sm" className="ml-4">
          <Link href="/register">
            Get Started
            <ArrowRightIcon className="ml-2 size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function RecentPosts({ posts }: { posts: Post[] }) {
  return (
    <div>
      {posts.map((post) => (
        <PostTeaser key={post.slug} post={post} />
      ))}
    </div>
  );
}

function Categories() {
  return (
    <div className="mb-4">
      <h1 className="text-3xl font-semibold mb-4 text-foreground">Blog</h1>
      <p className="text-muted-foreground">
        Welcome to the bragdoc.ai blog! We&apos;ll usually post stuff here about
        new product features as we ship them.
      </p>
    </div>
  );
}
