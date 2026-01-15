import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { getAllPosts } from '@/lib/blog';
import {
  FeaturedPostCard,
  RecentPostCard,
  CompactPostCard,
} from '@/components/blog';

export const metadata: Metadata = {
  title: 'BragDoc Blog: Career Development Tips for Developers',
  description:
    'Expert advice on achievement tracking, performance reviews, career growth, and developer productivity. Learn how to advance your career with brag documents.',
  keywords:
    'career development blog, developer career tips, performance review advice, achievement tracking',
  alternates: {
    canonical: '/blog',
  },
};

const FEATURED_SLUG = 'introducing-workstreams';
const RECENT_COUNT = 3;

export default function BlogPage() {
  const allPosts = getAllPosts();

  // Find the featured post
  const featuredPost = allPosts.find((post) => post.slug === FEATURED_SLUG);

  // Filter out the featured post from the remaining posts
  const remainingPosts = allPosts.filter((post) => post.slug !== FEATURED_SLUG);

  // Split into recent and older posts
  const recentPosts = remainingPosts.slice(0, RECENT_COUNT);
  const olderPosts = remainingPosts.slice(RECENT_COUNT);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-0">
        {/* Header Section */}
        <section className="pb-12 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
              BragDoc Blog
            </h1>
            <p className="text-lg text-muted-foreground text-balance">
              Tips, insights, and updates on tracking your achievements and
              advancing your career
            </p>
          </div>
        </section>

        {allPosts.length === 0 ? (
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-6xl text-center">
              <p className="text-muted-foreground text-lg">
                No blog posts yet. Check back soon!
              </p>
            </div>
          </section>
        ) : (
          <>
            {/* Featured Post Section */}
            {featuredPost && (
              <section className="pb-12 px-4">
                <div className="container mx-auto max-w-6xl">
                  <FeaturedPostCard post={featuredPost} />
                </div>
              </section>
            )}

            {/* Recent Posts Section */}
            {recentPosts.length > 0 && (
              <section className="py-12 px-4">
                <div className="container mx-auto max-w-6xl">
                  <h2 className="text-2xl font-bold mb-8">Recent Posts</h2>
                  <div className="flex flex-col gap-6">
                    {recentPosts.map((post) => (
                      <RecentPostCard key={post.slug} post={post} />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Older Posts Grid Section */}
            {olderPosts.length > 0 && (
              <section className="py-12 px-4">
                <div className="container mx-auto max-w-6xl">
                  <h2 className="text-2xl font-bold mb-8">More Articles</h2>
                  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {olderPosts.map((post) => (
                      <CompactPostCard key={post.slug} post={post} />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
