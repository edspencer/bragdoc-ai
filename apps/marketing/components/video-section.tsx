'use client';

import { Play } from 'lucide-react';

export function VideoSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
            See BragDoc in Action
          </h2>
          <p className="text-lg text-muted-foreground text-balance">
            Watch this 60-second overview to understand how BragDoc
            automatically tracks your achievements
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* YouTube embed container with 16:9 aspect ratio */}
          <div className="relative w-full rounded-lg overflow-hidden shadow-2xl bg-muted border border-border">
            <div className="relative pb-[56.25%]">
              {/* Placeholder until video is uploaded */}
              <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-primary/10 to-primary/5">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center size-20 rounded-full bg-primary/20 mb-4">
                    <Play className="size-10 text-primary ml-1" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Video coming soon
                  </p>
                </div>
              </div>

              {/* Replace the placeholder div above with this iframe when video is ready:
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
                title="BragDoc Overview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              */}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Learn how to install the CLI, extract achievements, and generate
            performance reviews in under a minute
          </p>
        </div>
      </div>
    </section>
  );
}
