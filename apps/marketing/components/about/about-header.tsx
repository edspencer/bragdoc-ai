export function AboutHeader() {
  return (
    <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-6">
          Why BragDoc Exists
          <span className="block text-[oklch(0.65_0.25_262)] dark:text-[oklch(0.7_0.25_262)] mt-2">
            The Problem We're Solving
          </span>
        </h1>
        <p className="text-xl text-muted-foreground text-pretty">
          Built by a developer who lived this problem
        </p>
      </div>
    </section>
  );
}
