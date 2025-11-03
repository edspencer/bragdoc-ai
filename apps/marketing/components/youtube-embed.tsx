'use client';

interface YouTubeEmbedProps {
  /**
   * YouTube video ID
   */
  videoId: string;
  /**
   * Title for the iframe (accessibility)
   */
  title: string;
  /**
   * Optional className for the container
   */
  className?: string;
}

/**
 * Reusable YouTube video embed component
 *
 * Renders a responsive 16:9 YouTube iframe embed
 */
export function YouTubeEmbed({
  videoId,
  title,
  className = '',
}: YouTubeEmbedProps) {
  return (
    <div
      className={`relative w-full rounded-lg overflow-hidden shadow-2xl bg-muted border border-border ${className}`}
    >
      <div className="relative pb-[56.25%]">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
