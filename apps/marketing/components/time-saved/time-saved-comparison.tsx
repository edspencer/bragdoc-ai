import type React from 'react';
import { Clock, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

/**
 * TimeSavedComparison - Marketing component comparing developer time investment
 *
 * Displays three personas (Organized Developer, Scrambler, BragDoc User) with
 * proportional time visualization bars and stress indicators. Demonstrates
 * BragDoc's value proposition through visual comparison.
 *
 * @param props - Component props
 * @param props.className - Optional CSS class names for styling
 * @returns JSX element rendering the time comparison section
 */

/**
 * Persona interface representing a developer workflow archetype
 * with time investment data and visual properties
 */
interface Persona {
  /** Display name for the persona */
  name: string;

  /** 1-2 sentence description of the persona */
  description: string;

  /** How this persona approaches documentation */
  approach: string;

  /** Numeric value for time bar calculations (total hours per year) */
  totalHoursPerYear: number;

  /** Display format for time value (e.g., "5-10 hours/year") */
  timeRangeDisplay: string;

  /** Stress level indicator */
  stressLevel: 'high' | 'medium' | 'low';

  /** Lucide React icon component */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;

  /** CSS color in oklch() format */
  color: string;

  /** Optional: Commits per year (context for organized developer) */
  commitsPerYear?: number;

  /** Optional: Number of commits worth documenting */
  committedItems?: number;

  /** Optional: Minutes per update for organized developer */
  timePerUpdate?: number;

  /** Optional: Review frequency for scrambler (e.g., "2x/year") */
  reviewFrequency?: string;

  /** Optional: Hours per review session for scrambler */
  timePerReviewSession?: number;
}

/**
 * Persona data objects representing three developer archetypes
 * and their annual time investment in documentation
 */
const personas: Persona[] = [
  {
    name: 'The Organized Developer',
    description:
      'Maintains an ongoing brag doc but invests significant time documenting accomplishments',
    approach:
      'Proactive manual documentation of 1-2 minutes per notable commit (~300/year)',
    totalHoursPerYear: 7.5, // Midpoint of 5-10 hours/year range
    timeRangeDisplay: '5-10 hours/year',
    stressLevel: 'medium',
    icon: Clock,
    color: 'oklch(0.55 0.15 240)', // Professional blue
    commitsPerYear: 1000,
    committedItems: 300,
    timePerUpdate: 1.5, // Minutes (average of 1-2)
  },
  {
    name: 'The Scrambler',
    description:
      'Avoids documentation until review time, then scrambles to compile achievements',
    approach:
      'Reactive documentation during 2 review cycles per year, 3-5 hours each',
    totalHoursPerYear: 8, // Midpoint of 6-10 hours/year range
    timeRangeDisplay: '6-10 hours/year',
    stressLevel: 'high',
    icon: AlertCircle,
    color: 'oklch(0.65 0.2 25)', // Urgent orange/red
    reviewFrequency: '2x/year',
    timePerReviewSession: 4, // Hours (average of 3-5)
  },
  {
    name: 'The BragDoc User',
    description:
      'Automates achievement tracking via CLI, reviews once per year',
    approach: 'Automated extraction + one annual review session',
    totalHoursPerYear: 0.25, // 15 minutes = 0.25 hours
    timeRangeDisplay: '~15 minutes/year',
    stressLevel: 'low',
    icon: CheckCircle,
    color: 'oklch(0.6 0.15 140)', // Calm green
  },
];

export function TimeSavedComparison({ className }: { className?: string }) {
  return (
    <section
      className={`py-20 px-4 sm:px-6 lg:px-8 ${className || ''}`}
      aria-labelledby="time-saved-heading"
    >
      <div className="container mx-auto max-w-6xl">
        {/* Section header */}
        <div className="text-center space-y-4 mb-16">
          <h2
            id="time-saved-heading"
            className="text-4xl sm:text-5xl font-bold tracking-tight text-balance leading-tight"
          >
            Your Time is Valuable - See How Much BragDoc Saves
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
            Honest time comparison across different documentation approaches
          </p>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Which developer are you today?
          </p>
        </div>

        {/* 3-column grid with persona cards */}
        <div
          className="grid md:grid-cols-3 gap-8"
          role="region"
          aria-label="Developer persona comparison cards"
        >
          {personas.map((persona) => (
            <PersonaCard key={persona.name} persona={persona} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * TimeBar - Sub-component for displaying proportional time investment visualization
 * Shows a horizontal progress bar scaled to 10-hour baseline with aria labels for accessibility
 */
interface TimeBarProps {
  totalHours: number;
  displayText: string;
  personaColor: string;
}

function TimeBar({ totalHours, displayText, personaColor }: TimeBarProps) {
  // Calculate width as percentage of 10-hour baseline
  const barWidthPercent = (totalHours / 10) * 100;

  return (
    <div className="mb-6">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block font-semibold">
        Annual Time Investment
      </div>
      <div className="relative h-8 bg-muted rounded-lg overflow-hidden border border-border">
        <div
          className="h-full rounded-lg transition-all duration-600 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
          style={{
            width: `${barWidthPercent}%`,
            backgroundColor: personaColor,
          }}
          role="progressbar"
          aria-valuenow={totalHours}
          aria-valuemin={0}
          aria-valuemax={10}
          aria-label={`${displayText} of annual time investment`}
          tabIndex={0}
        >
          <div className="h-full bg-linear-to-r from-transparent to-white/10" />
        </div>
      </div>
      <div className="flex justify-between items-center mt-2 px-1">
        <span className="text-sm font-medium">{displayText}</span>
        <span className="text-xs text-muted-foreground">
          {totalHours === 0.25 ? 'Minimal effort' : 'Higher effort'}
        </span>
      </div>
    </div>
  );
}

/**
 * PersonaCard - Sub-component displaying individual persona information
 * Internal helper component not exported
 */
interface PersonaCardProps {
  persona: Persona;
}

function PersonaCard({ persona }: PersonaCardProps) {
  const IconComponent = persona.icon;

  // Determine stress icon and color based on stress level
  let StressIconComponent: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  let stressIconColor: string;
  let stressDescription: string;

  if (persona.stressLevel === 'high') {
    StressIconComponent = AlertTriangle;
    stressIconColor = 'text-destructive';
    stressDescription = 'High stress - Deadline driven';
  } else if (persona.stressLevel === 'medium') {
    StressIconComponent = AlertCircle;
    stressIconColor = 'text-orange-500';
    stressDescription = 'Medium stress - Ongoing effort';
  } else {
    StressIconComponent = CheckCircle;
    stressIconColor = 'text-green-600';
    stressDescription = 'Low stress - Minimal effort';
  }

  return (
    <article
      className="group rounded-lg border border-border bg-card p-8 transition-all duration-200 hover:border-primary/50 hover:shadow-lg md:min-h-[600px] flex flex-col space-y-6"
      aria-label={`${persona.name} comparison card`}
    >
      {/* Header section with icon, persona name, and description */}
      <div className="space-y-4">
        {/* Icon background container - 48px */}
        <figure className="flex justify-center">
          <div
            className="flex size-12 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
            style={{ backgroundColor: persona.color }}
            aria-hidden="true"
          >
            <IconComponent className="size-6 text-white" aria-hidden="true" />
          </div>
        </figure>
        {/* Persona name and description */}
        <div className="space-y-2 text-center">
          <h3 className="text-lg font-bold leading-tight">{persona.name}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {persona.description}
          </p>
        </div>
      </div>

      {/* Approach section - "How they work:" label and approach text */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
          How they work:
        </p>
        <p className="text-sm leading-relaxed">{persona.approach}</p>
      </div>

      {/* Time Investment Visual - TimeBar component */}
      <TimeBar
        totalHours={persona.totalHoursPerYear}
        displayText={persona.timeRangeDisplay}
        personaColor={persona.color}
      />

      {/* Stress Level Indicator - Icon + color coding + text */}
      <div
        className="flex items-center gap-3 pt-4 border-t border-border"
        role="status"
        aria-live="polite"
      >
        <div className="flex size-6 items-center justify-center rounded shrink-0">
          <StressIconComponent
            className={`size-5 ${stressIconColor}`}
            aria-hidden="true"
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
            Stress Level
          </p>
          <p className="text-sm font-semibold capitalize leading-tight">
            {persona.stressLevel}
          </p>
          <p className="text-xs text-muted-foreground leading-tight">
            {stressDescription}
          </p>
        </div>
      </div>

      {/* Bottom section - Time savings for BragDoc user only */}
      {persona.name === 'The BragDoc User' && (
        <div className="mt-auto pt-4">
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1 font-semibold">
              Time Saved
            </p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 leading-tight">
              ~99.7%
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Compared to manual approaches
            </p>
          </div>
        </div>
      )}
    </article>
  );
}
