'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, GitCommit, Calendar, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useState } from 'react';
import { useTracking } from '@/hooks/use-posthog';
import { loginPath } from '@/lib/utils';
import { DemoCTA } from '@/components/demo-cta';

export function HeroSection() {
  const { trackCTAClick } = useTracking();
  const loginUrl = loginPath();

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
                Always be ready for standups, 1-on-1s, and performance reviews.
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
                variant="outline"
                className="text-base h-12 px-8 bg-transparent"
                asChild
              >
                <a
                  href="/how-it-works"
                  onClick={() =>
                    trackCTAClick(
                      'homepage_hero',
                      'See How It Works',
                      '/how-it-works',
                    )
                  }
                >
                  See How It Works
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

            <DemoCTA />
          </div>

          <div className="relative">
            <Card className="p-6 space-y-4 bg-card border-border shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Recent Achievements</h3>
                <Badge variant="secondary">This Week</Badge>
              </div>

              <div className="space-y-3">
                <AchievementItem
                  title="Implemented user authentication system"
                  impact={5}
                  project="Auth Service"
                  projectColor="bg-blue-500"
                  date="2 days ago"
                />
                <AchievementItem
                  title="Optimized database queries reducing load time by 40%"
                  impact={4}
                  project="Backend API"
                  projectColor="bg-green-500"
                  date="3 days ago"
                />
                <AchievementItem
                  title="Fixed critical bug in payment processing"
                  impact={5}
                  project="Payments"
                  projectColor="bg-red-500"
                  date="5 days ago"
                />
                <AchievementItem
                  title="Added dark mode support to dashboard"
                  impact={3}
                  project="Frontend"
                  projectColor="bg-purple-500"
                  date="1 week ago"
                />
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <GitCommit className="size-4" />
                  <span>127 commits analyzed</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  <span>Last 30 days</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
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

function AchievementItem({
  title,
  impact,
  project,
  projectColor,
  date,
}: {
  title: string;
  impact: number;
  project: string;
  projectColor: string;
  date: string;
}) {
  return (
    <div className="p-4 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <p className="font-medium leading-snug">{title}</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`size-3 ${i < impact ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground/30'}`}
                />
              ))}
            </div>
            <Badge variant="outline" className="text-xs">
              <div className={`size-2 rounded-full ${projectColor} mr-1.5`} />
              {project}
            </Badge>
          </div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {date}
        </span>
      </div>
    </div>
  );
}
