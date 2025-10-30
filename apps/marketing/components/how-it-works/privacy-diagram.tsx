import Image from 'next/image';

export function PrivacyDiagram() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            Privacy-First Architecture Diagram
          </h2>
          <div className="rounded-lg border border-border bg-background p-4 sm:p-6 lg:p-8 shadow-sm">
            <Image
              src="/privacy-architecture.svg"
              alt="BragDoc privacy architecture diagram showing the CLI tool on your laptop extracting commits from git projects, using an AI provider like OpenAI to scan work for achievements, and then sending only achievements to bragdoc.ai. Importantly, git data never goes to the cloud - there is a clear separation between your laptop/git and cloud services."
              width={1200}
              height={600}
              className="w-full h-auto"
              priority={false}
            />
          </div>
          <p className="text-sm text-muted-foreground text-center mt-6 max-w-3xl mx-auto">
            Your code and git history never leave your machine. The CLI extracts
            commit metadata locally, sends it to your chosen AI provider for
            analysis, and only the resulting achievements are sent to
            BragDoc&apos;s cloud storage.
          </p>
        </div>
      </div>
    </section>
  );
}
