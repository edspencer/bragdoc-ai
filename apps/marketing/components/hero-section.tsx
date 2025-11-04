'use client';

import { Button } from '@/components/ui/button';
import { Star, Check, Sparkles } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState } from 'react';
import { useTracking } from '@/hooks/use-posthog';
import { loginPath, appPath } from '@/lib/utils';
import Image from 'next/image';
import { useImageLightbox } from '@/hooks/use-image-lightbox';
import { ImageLightbox } from '@/components/image-lightbox';

export function HeroSection() {
  const { trackCTAClick } = useTracking();
  const loginUrl = loginPath();
  const demoUrl = appPath('/demo');
  const { lightboxImage, openLightbox, closeLightbox } = useImageLightbox();

  const sampleAchievements = [
    {
      title: 'Implemented real-time collaboration features',
      detail:
        'Built WebSocket infrastructure and synchronized state management across multiple clients',
      description: 'Added 3 weeks ago',
      rating: 8,
    },
    {
      title: 'Refactored authentication middleware for better security',
      detail:
        'Migrated from JWT to session-based auth with Redis, added rate limiting and CSRF protection',
      description: 'Added 1 month ago',
      rating: 9,
    },
    {
      title: 'Built automated deployment pipeline',
      detail:
        'Created CI/CD workflow with GitHub Actions, automated testing, and zero-downtime deployments',
      description: 'Added 2 weeks ago',
      rating: 7,
    },
  ];

  const initials = ['NP', 'GG', 'ES'];

  return (
    <>
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(to right, #80808012 1px, transparent 1px), linear-gradient(to bottom, #80808012 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
                  Never Forget What You've Accomplished
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed text-pretty">
                  Automatically track your work achievements from git commits.
                  Always be ready for standups, 1-on-1s, and performance
                  reviews.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="text-base h-12 px-8" asChild>
                  <a
                    href={loginUrl}
                    onClick={() =>
                      trackCTAClick(
                        'homepage_hero',
                        'Start Tracking Free',
                        loginUrl,
                      )
                    }
                  >
                    Start Tracking Free
                  </a>
                </Button>
                <Button
                  size="lg"
                  className="text-base h-12 px-8 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0 shadow-md hover:shadow-lg transition-all"
                  asChild
                >
                  <a
                    href={demoUrl}
                    onClick={() =>
                      trackCTAClick('homepage_hero', 'Try FREE demo', demoUrl)
                    }
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Try FREE demo
                  </a>
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {sampleAchievements.map((achievement, index) => (
                      <AvatarWithPopover
                        key={index}
                        achievement={achievement}
                        initials={initials[index]}
                      />
                    ))}
                  </div>
                  <span>10,000+ achievements tracked</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-lg overflow-hidden shadow-2xl">
                <button
                  type="button"
                  onClick={() =>
                    openLightbox(
                      '/screenshots/ui/hero.png',
                      'BragDoc dashboard showing recent achievements',
                    )
                  }
                  className="w-full cursor-zoom-in transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
                  aria-label="View larger: BragDoc dashboard showing recent achievements"
                >
                  <Image
                    src="/screenshots/ui/hero.png"
                    alt="BragDoc dashboard showing recent achievements"
                    width={1200}
                    height={800}
                    priority
                    className="w-full h-auto"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}

function AvatarWithPopover({
  achievement,
  initials,
}: {
  achievement: {
    title: string;
    detail: string;
    description: string;
    rating: number;
  };
  initials: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className="size-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-xs font-semibold text-primary cursor-pointer hover:bg-primary/20 transition-colors"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {initials}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-4" side="bottom" align="center">
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-500 mb-2">
            <Check className="size-3.5" />
            <span className="font-medium">Captured automatically from Git</span>
          </div>
          <h4 className="font-semibold text-sm leading-snug">
            {achievement.title}
          </h4>
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            {achievement.detail}
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {achievement.description}
            </span>
            <div className="flex items-center gap-1">
              <Star className="size-3 fill-yellow-500 text-yellow-500" />
              <span className="text-xs font-medium">
                {achievement.rating}/10
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
