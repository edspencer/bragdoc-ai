'use client';

import {
  Terminal,
  LayoutDashboard,
  FolderKanban,
  Clock,
  FileText,
  TrendingUp,
  Download,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { useImageLightbox } from '@/hooks/use-image-lightbox';
import { ImageLightbox } from '@/components/image-lightbox';
import { useTracking } from '@/hooks/use-posthog';

interface Feature {
  icon: LucideIcon;
  heading: string;
  description: string;
  bullets: string[];
  screenshotAlt: string;
  screenshot?: string;
}

const features: Feature[] = [
  {
    icon: Terminal,
    heading: 'Automatic Git Extraction',
    description:
      'The BragDoc CLI extracts achievements from your git commits using AI, analyzing commit messages and metadata to capture your work automatically.',
    bullets: [
      'Analyzes commit messages and metadata',
      'Works with any git repository (public, private, on-premise)',
      'Your code never leaves your machine',
      'Intelligent caching prevents reprocessing',
    ],
    screenshotAlt:
      'BragDoc CLI extracting achievements from Git commits with AI-powered analysis',
    screenshot: '/screenshots/terminal/bragdoc-extract.png',
  },
  {
    icon: LayoutDashboard,
    heading: 'Achievement Dashboard',
    description:
      'Get a centralized view of all your accomplishments with powerful sorting, filtering, and organization tools.',
    bullets: [
      'Sort by date, impact, or project',
      'Filter by company, date range, project',
      'Inline editing and rating',
      'Color-coded projects for easy identification',
    ],
    screenshotAlt:
      'BragDoc achievement dashboard showing filtered career accomplishments by project and date',
    screenshot: '/screenshots/ui/dashboard.png',
  },
  {
    icon: FolderKanban,
    heading: 'Project & Company Organization',
    description:
      'Keep your achievements organized across multiple projects and employers with visual color coding and GitHub integration.',
    bullets: [
      'Link achievements to specific projects',
      'Track multiple companies/employers',
      'GitHub integration for repositories',
      'Visual color coding for quick identification',
    ],
    screenshotAlt:
      'BragDoc project management interface with color-coded repositories and GitHub integration',
    screenshot: '/screenshots/ui/projects.png',
  },
  {
    icon: Clock,
    heading: 'Standup Mode',
    description:
      'Never be caught off-guard in standups again. BragDoc automatically prepares your standup notes with recent achievements and work in progress.',
    bullets: [
      'Automatic WIP extraction before standup time',
      'Recent achievements included',
      'Multi-repository aggregation',
      'Formatted for easy reading',
    ],
    screenshotAlt:
      'BragDoc standup mode automatically generating daily meeting notes from recent Git commits',
    screenshot: '/screenshots/ui/standup.png',
  },
  {
    icon: FileText,
    heading: 'AI-Powered Document Generation',
    description:
      'Generate polished reports for your manager with AI-powered analysis and professional formatting.',
    bullets: [
      'Generate reports for weekly, monthly, or custom time ranges',
      'AI analyzes and organizes your achievements',
      'Professional formatting ready to share',
      'Editable and customizable to your needs',
    ],
    screenshotAlt:
      'AI-generated performance review document created from tracked achievements in BragDoc',
    screenshot: '/screenshots/ui/reports.png',
  },
  {
    icon: TrendingUp,
    heading: 'Impact Tracking & Analytics',
    description:
      'Visualize your impact over time with comprehensive analytics and trending data.',
    bullets: [
      'Impact points trending over time',
      'Achievement distribution analysis',
      'Project contribution breakdown',
      'Timeline visualization of your work',
    ],
    screenshotAlt:
      'BragDoc analytics dashboard displaying achievement impact trends and project contribution charts',
    screenshot: '/screenshots/ui/project-analytics.png',
  },
  {
    icon: Terminal,
    heading: 'CLI Power Tools',
    description:
      'The BragDoc CLI is designed for developers who want powerful automation with minimal setup.',
    bullets: [
      'One-time setup, runs automatically',
      'Cron/Task Scheduler integration',
      'Multiple LLM providers supported',
      'Offline-capable with Ollama',
    ],
    screenshotAlt:
      'BragDoc CLI power user commands for automated achievement tracking with multiple LLM providers',
    screenshot: '/screenshots/terminal/bragdoc-llm-set.png',
  },
  {
    icon: Download,
    heading: 'Data Export & Portability',
    description:
      'Your data is yours. Export everything anytime with no vendor lock-in.',
    bullets: [
      'Export everything to JSON',
      'Import from previous exports',
      'No vendor lock-in',
      'Backup anytime you want',
    ],
    screenshotAlt:
      'BragDoc data export interface allowing JSON backup of all career achievements and projects',
    screenshot: '/screenshots/ui/account.png',
  },
];

export function FeaturesPageClient() {
  const { lightboxImage, openLightbox, closeLightbox } = useImageLightbox();
  const { trackFeatureExplored, trackCTAClick } = useTracking();

  return (
    <>
      <main className="pt-16">
        {/* Header Section */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-balance">
                Achievement Tracking Features: Git-Powered & AI-Enhanced
              </h1>
              <p className="text-xl text-muted-foreground mb-12 text-balance max-w-3xl mx-auto">
                Comprehensive Achievement Tracking
              </p>
              <p className="text-lg text-muted-foreground mb-16 max-w-2xl mx-auto">
                BragDoc combines powerful CLI automation with a beautiful web
                interface
              </p>
            </div>

            {/* Two-column feature intro */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="flex items-start gap-4 p-6 rounded-lg border border-border bg-card">
                <div
                  className="flex size-12 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'var(--feature-accent)' }}
                >
                  <Terminal className="size-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">CLI Features</h3>
                  <p className="text-sm text-muted-foreground">
                    Privacy-first local extraction and automation
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 rounded-lg border border-border bg-card">
                <div
                  className="flex size-12 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'var(--feature-accent)' }}
                >
                  <Globe className="size-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Web App Features
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Beautiful interface for organizing and sharing
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Sections */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <div className="space-y-24">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const isEven = index % 2 === 0;

                return (
                  <article
                    key={index}
                    className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center"
                  >
                    {/* Content */}
                    <div className={isEven ? 'md:order-1' : 'md:order-2'}>
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: 'var(--feature-accent)' }}
                        >
                          <Icon className="size-5 text-white" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold">
                          {feature.heading}
                        </h2>
                      </div>
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        {feature.description}
                      </p>
                      <ul className="space-y-3">
                        {feature.bullets.map((bullet, bulletIndex) => (
                          <li
                            key={bulletIndex}
                            className="flex items-start gap-3"
                          >
                            <div
                              className="size-1.5 rounded-full mt-2 shrink-0"
                              style={{
                                backgroundColor: 'var(--feature-accent)',
                              }}
                            />
                            <span className="text-sm text-muted-foreground leading-relaxed">
                              {bullet}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Screenshot */}
                    <div className={isEven ? 'md:order-2' : 'md:order-1'}>
                      <div className="relative aspect-video rounded-lg border-2 border-border bg-muted/30 overflow-hidden">
                        {feature.screenshot ? (
                          <button
                            type="button"
                            onClick={() => {
                              trackFeatureExplored(
                                feature.heading,
                                'features_page',
                              );
                              openLightbox(
                                feature.screenshot!,
                                feature.screenshotAlt,
                              );
                            }}
                            className="w-full h-full cursor-zoom-in transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
                            aria-label={`View larger: ${feature.screenshotAlt}`}
                          >
                            <Image
                              src={feature.screenshot}
                              alt={feature.screenshotAlt}
                              fill
                              className="object-cover"
                            />
                          </button>
                        ) : (
                          <>
                            <Image
                              src={`/placeholder.jpg?height=400&width=600&query=${encodeURIComponent(feature.screenshotAlt)}`}
                              alt={feature.screenshotAlt}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-sm text-muted-foreground bg-background/80 px-4 py-2 rounded-md">
                                {feature.screenshotAlt}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 mt-12">
          <div
            className="container mx-auto max-w-4xl rounded-2xl p-12 text-center"
            style={{
              background: `linear-gradient(135deg, var(--feature-accent) 0%, oklch(from var(--feature-accent) calc(l * 0.85) c calc(h + 20)) 100%)`,
            }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white text-balance">
              See All Features in Action
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-foreground hover:bg-white/90"
                asChild
              >
                <a
                  href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://app.bragdoc.ai'}/dashboard`}
                  onClick={() =>
                    trackCTAClick(
                      'features_page_bottom',
                      'Get Started Free',
                      `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.bragdoc.ai'}/dashboard`,
                    )
                  }
                >
                  Get Started Free
                </a>
              </Button>
              <Link
                href="/cli"
                className="text-white hover:text-white/80 transition-colors underline underline-offset-4"
                onClick={() =>
                  trackCTAClick(
                    'features_page_bottom',
                    'View Documentation',
                    '/cli',
                  )
                }
              >
                View Documentation
              </Link>
            </div>
          </div>
        </section>
      </main>

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
