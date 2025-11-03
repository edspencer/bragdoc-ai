'use client';

import { YouTubeEmbed } from '../youtube-embed';

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
          <YouTubeEmbed
            videoId="-AS45-hLDe0"
            title="Getting Started with BragDoc"
            className="shadow-xl"
          />

          <p className="text-center text-sm text-muted-foreground mt-6">
            Follow along as we walk through installation, configuration, and
            your first achievement extraction
          </p>
        </div>
      </div>
    </section>
  );
}
