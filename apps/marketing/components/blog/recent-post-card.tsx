import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { BlogPost } from '@/lib/blog';

interface RecentPostCardProps {
  post: BlogPost;
}

export function RecentPostCard({ post }: RecentPostCardProps) {
  return (
    <Link href={`/blog/${post.slug}`} className="block group">
      <article className="bg-card text-card-foreground rounded-xl border shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="flex flex-col md:flex-row">
          {/* Image - 40% width on desktop, full width on mobile */}
          {post.image ? (
            <div className="relative w-full md:w-2/5 aspect-[16/9] md:aspect-auto md:min-h-[280px] overflow-hidden">
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
            </div>
          ) : (
            <div className="relative w-full md:w-2/5 aspect-[16/9] md:aspect-auto md:min-h-[280px] bg-muted flex items-center justify-center">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}

          {/* Content - 60% width on desktop */}
          <div className="flex-1 p-6 flex flex-col justify-center">
            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
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
            <h3 className="text-xl md:text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
              {post.title}
            </h3>

            {/* Description */}
            <p className="text-muted-foreground mb-4 line-clamp-2">
              {post.description}
            </p>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
                {post.tags.length > 4 && (
                  <Badge variant="outline">+{post.tags.length - 4}</Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
