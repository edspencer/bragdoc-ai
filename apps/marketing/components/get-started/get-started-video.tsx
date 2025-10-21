'use client';

import { Play } from 'lucide-react';

export function GetStartedVideo() {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 text-balance">
            Getting Started with BragDoc
          </h2>
          <p className="text-base text-muted-foreground text-balance">
            Watch this quick tutorial to see how easy it is to set up and start
            tracking your achievements
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* YouTube embed container with 16:9 aspect ratio */}
          <div className="relative w-full rounded-lg overflow-hidden shadow-xl bg-muted border border-border">
            <div className="relative pb-[56.25%]">
              {/* Placeholder until video is uploaded */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-4">
                    <Play className="w-10 h-10 text-primary ml-1" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Getting Started video coming soon
                  </p>
                </div>
              </div>

              {/* Replace the placeholder div above with this iframe when video is ready:
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
                title="Getting Started with BragDoc"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              */}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Follow along as we walk through installation, configuration, and
            your first achievement extraction
          </p>
        </div>
      </div>
    </section>
  );
}
