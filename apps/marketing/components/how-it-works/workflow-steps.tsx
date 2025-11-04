'use client';

import {
  Download,
  FolderPlus,
  Settings,
  Sparkles,
  Layout,
  Calendar,
  FileText,
} from 'lucide-react';
import Image from 'next/image';
import { CodeBlock } from '@/components/code-block';
import { useImageLightbox } from '@/hooks/use-image-lightbox';
import { ImageLightbox } from '@/components/image-lightbox';

const steps = [
  {
    number: 1,
    title: 'Install the CLI',
    time: '2 minutes',
    icon: Download,
    description: 'Quick installation via npm, authenticate in browser',
    codeBlocks: [
      { code: 'npm install -g @bragdoc/cli', language: 'bash' },
      { code: 'bragdoc login', language: 'bash' },
    ],
    screenshot:
      'Installing BragDoc CLI via npm for automated Git commit analysis',
    screenshotImage: '/screenshots/terminal/bragdoc-install-login.png',
  },
  {
    number: 2,
    title: 'Initialize Your Projects',
    time: '1 minute per project',
    icon: FolderPlus,
    description: 'Point CLI at your git repositories',
    codeBlocks: [
      { code: 'cd ~/projects/my-app && bragdoc init', language: 'bash' },
    ],
    screenshot:
      'Initializing BragDoc in a Git repository to start tracking achievements',
    screenshotImage: '/screenshots/terminal/bragdoc-init.png',
  },
  {
    number: 3,
    title: 'Configure Your LLM',
    time: '1 minute',
    icon: Settings,
    description: [
      'Choose your AI provider: OpenAI, Anthropic, Google, DeepSeek, or Ollama',
      'Ollama is completely free and runs locally',
      'Your API key, your costs, your control',
    ],
    codeBlocks: [{ code: 'bragdoc llm set', language: 'bash' }],
    screenshot:
      'Configuring AI provider (OpenAI, Anthropic, or Ollama) for BragDoc achievement extraction',
    screenshotImage: '/screenshots/terminal/bragdoc-llm-set.png',
  },
  {
    number: 4,
    title: 'Extract Your First Achievements',
    time: '30 seconds',
    icon: Sparkles,
    description: [
      'CLI analyzes your git commits',
      'AI identifies meaningful achievements',
      'Smart caching prevents reprocessing',
    ],
    codeBlocks: [{ code: 'bragdoc extract', language: 'bash' }],
    screenshot:
      'BragDoc CLI analyzing Git commits and extracting achievements using AI',
    screenshotImage: '/screenshots/terminal/bragdoc-extract.png',
  },
  {
    number: 5,
    title: 'Review in Web App',
    time: 'As needed',
    icon: Layout,
    description: [
      'Navigate to app.bragdoc.ai/achievements',
      'Review AI-extracted achievements',
      'Edit, organize, add context',
      'Rate impact, link to projects',
    ],
    codeBlocks: [],
    screenshot:
      'BragDoc web app displaying AI-extracted achievements from Git commits ready for review',
    screenshotImage: '/screenshots/ui/dashboard.png',
  },
  {
    number: 6,
    title: 'Set Up Automation',
    time: 'Optional, 2 minutes',
    icon: Calendar,
    description: [
      'Configure automatic extraction schedule (daily, hourly, custom)',
      'Set up standup mode for meeting prep',
      'Runs silently in background via cron/Task Scheduler',
    ],
    codeBlocks: [],
    screenshot:
      'BragDoc standup automation settings for daily meeting preparation from recent work',
    screenshotImage: '/screenshots/ui/standup.png',
  },
  {
    number: 7,
    title: 'Generate Documents',
    time: 'Instant',
    icon: FileText,
    description: [
      "Click 'Reports'",
      'Select time range (week, month, quarter)',
      'AI generates polished report',
      'Edit and share',
    ],
    codeBlocks: [],
    screenshot:
      'BragDoc AI document generator creating performance review reports from tracked achievements',
    screenshotImage: '/screenshots/ui/reports.png',
  },
];

export function WorkflowSteps() {
  const { lightboxImage, openLightbox, closeLightbox } = useImageLightbox();

  return (
    <>
      <section className="py-16 sm:py-20 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
              Step-by-Step Walkthrough
            </h2>

            <div className="space-y-24">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isEven = index % 2 === 0;

                return (
                  <div
                    key={step.number}
                    className={`flex flex-col ${
                      isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
                    } gap-8 lg:gap-12 items-center`}
                  >
                    {/* Content Side */}
                    <div className="flex-1 w-full">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="shrink-0 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                          {step.number}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Icon className="size-6 text-primary" />
                            <h3 className="text-2xl font-bold">{step.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {step.time}
                          </p>
                        </div>
                      </div>

                      <div className="ml-16 space-y-4">
                        {Array.isArray(step.description) ? (
                          <ul className="space-y-2">
                            {step.description.map((item, i) => (
                              <li
                                key={i}
                                className="text-muted-foreground flex items-start gap-2"
                              >
                                <span className="text-primary mt-1">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">
                            {step.description}
                          </p>
                        )}

                        {step.codeBlocks.length > 0 && (
                          <div className="space-y-3">
                            {step.codeBlocks.map((block, i) => (
                              <CodeBlock
                                key={i}
                                code={block.code}
                                language={block.language}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Visual Side */}
                    <div className="flex-1 w-full">
                      <div className="aspect-video rounded-lg border-2 border-border bg-muted/50 flex items-center justify-center p-1 overflow-hidden">
                        {step.screenshotImage ? (
                          <button
                            type="button"
                            onClick={() =>
                              openLightbox(
                                step.screenshotImage,
                                step.screenshot,
                              )
                            }
                            className="w-full h-full cursor-zoom-in transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
                            aria-label={`View larger: ${step.screenshot}`}
                          >
                            <Image
                              src={step.screenshotImage}
                              alt={step.screenshot}
                              width={1200}
                              height={675}
                              className="object-contain w-full h-full"
                            />
                          </button>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center italic">
                            {step.screenshot}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
