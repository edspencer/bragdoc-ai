import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { BlogPost } from '@/lib/blog';

interface FeaturedPostCardProps {
  post: BlogPost;
}

export function FeaturedPostCard({ post }: FeaturedPostCardProps) {
  return (
    <Link href={`/blog/${post.slug}`} className="block group">
      <article className="bg-card text-card-foreground rounded-xl border shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300">
        {/* Hero Image */}
        <div className="px-6 pt-6 md:px-8 md:pt-8">
          {post.image ? (
            <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg">
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 1200px) 100vw, 1200px"
                priority
              />
            </div>
          ) : (
            <div className="relative aspect-[2/1] w-full bg-muted flex items-center justify-center rounded-lg">
              <span className="text-muted-foreground text-lg">
                Featured Post
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
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

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold mb-4 group-hover:text-primary transition-colors">
            {post.title}
          </h2>

          {/* Excerpt */}
          <p className="text-muted-foreground text-lg leading-relaxed mb-6 line-clamp-3">
            {post.excerpt || post.description}
          </p>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Read more link */}
          <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
            <span>Read more</span>
            <ArrowRight className="size-4" />
          </div>
        </div>
      </article>
    </Link>
  );
}
