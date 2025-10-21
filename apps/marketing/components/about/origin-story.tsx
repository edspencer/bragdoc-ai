export function OriginStory() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-3xl">
        <div className="space-y-8">
          <p className="text-xl leading-relaxed text-muted-foreground">
            I built BragDoc because I lived this problem.
          </p>

          <p className="text-lg leading-relaxed text-muted-foreground">
            Three years into my career at a major tech company, I was passed
            over for a promotion. My manager told me I was doing great work, but
            when it came time to make the case to leadership, neither of us
            could articulate my specific impact. We had vague memories of
            projects I'd worked on, but no concrete data about what I'd built or
            the problems I'd solved.
          </p>

          <blockquote className="border-l-4 border-[oklch(0.65_0.25_262)] dark:border-[oklch(0.7_0.25_262)] pl-6 py-2 my-8">
            <p className="text-2xl sm:text-3xl font-medium leading-relaxed text-balance">
              I couldn't articulate my impact because I hadn't tracked it.
            </p>
          </blockquote>

          <p className="text-lg leading-relaxed text-muted-foreground">
            That moment changed everything. I started manually keeping a work
            journal, but life got busy and I'd forget to update it. I tried
            various productivity apps, but they all required too much manual
            effort. What I needed was something that would automatically capture
            my work as I did it.
          </p>

          <p className="text-lg leading-relaxed text-muted-foreground">
            I vowed never to let my work disappear again. That's why I built
            BragDoc.
          </p>
        </div>
      </div>
    </section>
  );
}
