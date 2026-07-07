export function ValuesSection() {
  const values = [
    {
      emoji: '🔒',
      title: 'Privacy First',
      description: 'Your code and work are yours',
    },
    {
      emoji: '💰',
      title: 'Free Forever',
      description: 'Completely free — bring your own LLM key or self-host',
    },
    {
      emoji: '🔓',
      title: 'User Control',
      description: 'Open source, self-hosting, data export',
    },
    {
      emoji: '🌱',
      title: 'Sustainability',
      description: 'No VC pressure, build for the long term',
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          Our Values
        </h2>
        <div className="space-y-6">
          {values.map((value, index) => (
            <div key={index} className="flex items-start gap-4">
              <span className="text-3xl shrink-0">{value.emoji}</span>
              <div>
                <h3 className="text-xl font-semibold mb-1">{value.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
