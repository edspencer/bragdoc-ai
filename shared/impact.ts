// The impact scale: 1–10, how much an achievement mattered. Written fresh for BragDoc Local (D2). It's guidance, not a
// formula: people (and agents, via the agent guide and bragdoc_get_context) pick the number that fits best.

export interface ImpactLevel {
  value: number;
  label: string;
  guidance: string;
}

export const IMPACT_SCALE: readonly ImpactLevel[] = [
  { value: 1, label: 'Routine', guidance: 'Everyday work done well: worth remembering, not worth a headline.' },
  { value: 2, label: 'Helpful', guidance: 'Made someone\'s day easier: a quick fix, a good answer, an unblocked colleague.' },
  { value: 3, label: 'Solid', guidance: 'A piece of work finished properly that your team relied on.' },
  { value: 4, label: 'Noticed', guidance: 'Your team noticed: it saved real time, removed a recurring pain or set a better habit.' },
  { value: 5, label: 'Significant', guidance: 'Moved a team goal forward, or something people outside your team now use.' },
  { value: 6, label: 'Major', guidance: 'Shipped a feature or change that customers or several teams feel.' },
  { value: 7, label: 'Standout', guidance: 'Changed how a group works, or delivered a result leadership points to.' },
  { value: 8, label: 'Exceptional', guidance: 'Shaped a product line, a big launch or a hard migration: hard to imagine it without you.' },
  { value: 9, label: 'Defining', guidance: 'A result the whole organisation knows about and will cite for years.' },
  { value: 10, label: 'Career-defining', guidance: 'Once-in-a-career: it changed the company\'s direction or its fortunes.' },
];

/** The level for a value (1–10), or undefined. */
export const impactLevel = (value: number | undefined): ImpactLevel | undefined => IMPACT_SCALE.find((l) => l.value === value);
