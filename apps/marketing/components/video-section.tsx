'use client';

import { YouTubeEmbed } from './youtube-embed';

export function VideoSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
            See BragDoc in Action
          </h2>
          <p className="text-lg text-muted-foreground text-balance">
            Watch this 90-second overview to understand how BragDoc
            automatically tracks your achievements
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <YouTubeEmbed videoId="-AS45-hLDe0" title="BragDoc Overview" />

          <p className="text-center text-sm text-muted-foreground mt-6">
            Learn how to install the CLI, extract achievements, and generate
            performance reviews in under a minute
          </p>
        </div>
      </div>
    </section>
  );
}
