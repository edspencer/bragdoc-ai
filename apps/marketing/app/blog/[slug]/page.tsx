import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { getPostBySlug, getAllPosts } from '@/lib/blog';
import { notFound } from 'next/navigation';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { BlogPostingSchema } from '@/components/structured-data/blog-posting-schema';

export async function generateMetadata({
  params,
}: { params: { slug: string } }): Promise<Metadata> {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return {
      title: 'Post Not Found - BragDoc Blog',
    };
  }

  return {
    title: `${post.title} | BragDoc Blog`,
    description: post.description,
    keywords: post.tags?.join(', '),
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: post.author ? [post.author] : undefined,
      url: `https://www.bragdoc.ai/blog/${post.slug}`,
      siteName: 'BragDoc',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <BlogPostingSchema post={post} />
      <Header />
      <main className="min-h-screen">
        <article className="py-12 px-4">
          <div className="container mx-auto max-w-3xl">
            {/* Back Button */}
            <Link href="/blog">
              <Button variant="ghost" className="mb-8">
                <ArrowLeft className="mr-2 size-4" />
                Back to Blog
              </Button>
            </Link>

            {/* Post Header */}
            <header className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  <time dateTime={post.date}>
                    {format(new Date(post.date), 'MMMM d, yyyy')}
                  </time>
                </div>
                {post.author && (
                  <div className="flex items-center gap-2">
                    <User className="size-4" />
                    <span>{post.author}</span>
                  </div>
                )}
              </div>
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-lg text-muted-foreground text-pretty">
                {post.description}
              </p>
            </header>

            {/* Post Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <MDXRemote source={post.content} />
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
