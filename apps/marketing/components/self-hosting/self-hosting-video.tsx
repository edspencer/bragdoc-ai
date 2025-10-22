'use client';

import { Play } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function SelfHostingVideo() {
  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Watch the Setup Guide
            </h2>
            <p className="text-muted-foreground">
              Follow along with this quick video tutorial to get BragDoc running
              on your infrastructure
            </p>
          </div>

          <Card className="overflow-hidden bg-muted/50 border-2">
            <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5">
              {/* Placeholder for YouTube video */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center size-20 rounded-full bg-primary/20 backdrop-blur-sm mb-4">
                    <Play className="size-10 text-primary ml-1" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground">
                    Self-hosting tutorial video coming soon
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Follow the written guide below to get started
                  </p>
                </div>
              </div>

              {/* Uncomment and add your YouTube video ID when ready */}
              {/* <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
                title="BragDoc Self-Hosting Guide"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              /> */}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
