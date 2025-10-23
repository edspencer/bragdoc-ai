import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { getAllPosts } from '@/lib/blog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

export const metadata: Metadata = {
  title: 'BragDoc Blog: Career Development Tips for Developers',
  description:
    'Expert advice on achievement tracking, performance reviews, career growth, and developer productivity. Learn how to advance your career with brag documents.',
  keywords:
    'career development blog, developer career tips, performance review advice, achievement tracking',
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Header Section */}
        <section className="py-20 px-4">
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

        {/* Blog Posts Grid */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  No blog posts yet. Check back soon!
                </p>
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                      <CardHeader>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Calendar className="size-4" />
                          <time dateTime={post.date}>
                            {format(new Date(post.date), 'MMMM d, yyyy')}
                          </time>
                        </div>
                        <CardTitle className="text-xl hover:text-primary transition-colors">
                          {post.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-3">
                          {post.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {post.author && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <User className="size-4" />
                            <span>{post.author}</span>
                          </div>
                        )}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {post.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
