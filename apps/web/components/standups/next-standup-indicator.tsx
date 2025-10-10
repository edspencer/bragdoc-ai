'use client';

import { useEffect, useState } from 'react';
import { format, formatDistanceToNow, isTomorrow, isToday } from 'date-fns';
import { computeNextRunUTC } from '@/lib/scheduling/nextRun';
import { toZonedTime } from 'date-fns-tz';

interface NextStandupIndicatorProps {
  meetingTime: string;
  daysMask: number;
  timezone: string;
}

export function NextStandupIndicator({
  meetingTime,
  daysMask,
  timezone,
}: NextStandupIndicatorProps) {
  const [nextStandup, setNextStandup] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  // Calculate next standup
  useEffect(() => {
    const calculateNext = () => {
      const now = new Date();
      const nextUtc = computeNextRunUTC(now, timezone, meetingTime, daysMask);
      setNextStandup(nextUtc);
    };

    calculateNext();
    // Recalculate every minute to keep the "from now" time fresh
    const interval = setInterval(() => {
      calculateNext();
      setTick((t) => t + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [meetingTime, daysMask, timezone]);

  if (!nextStandup) {
    return null;
  }

  // Format the time in the standup's timezone
  const nextStandupInTz = toZonedTime(nextStandup, timezone);
  const timeParts = meetingTime.split(':').map(Number);
  const hours = timeParts[0] ?? 0;
  const minutes = timeParts[1] ?? 0;
  const period = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  const timeStr =
    minutes > 0
      ? `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`
      : `${displayHours}${period}`;

  // Determine day label
  let dayLabel = '';
  const now = new Date();
  const nextStandupLocal = toZonedTime(nextStandup, timezone);

  if (isToday(nextStandupLocal)) {
    dayLabel = 'today';
  } else if (isTomorrow(nextStandupLocal)) {
    dayLabel = 'tomorrow';
  } else {
    dayLabel = format(nextStandupLocal, 'EEEE'); // e.g., "Monday"
  }

  // Calculate relative time
  const relativeTime = formatDistanceToNow(nextStandup, { addSuffix: false });

  return (
    <div className="text-sm text-muted-foreground">
      Next Standup: {dayLabel} at {timeStr} ({relativeTime} from now)
    </div>
  );
}
