/**
 * Utilities for converting user input to cron schedule strings
 */

export type ScheduleFrequency = 'no' | 'hourly' | 'daily' | 'custom';

export interface CronOptions {
  frequency: ScheduleFrequency;
  minutesAfterHour?: number; // For hourly schedules
  dailyTime?: string; // For daily schedules (HH:MM format)
  cronExpression?: string; // For custom schedules
}

/**
 * Convert user input to a cron schedule string
 */
export function convertToCronSchedule(options: CronOptions): string | null {
  switch (options.frequency) {
    case 'no':
      return null;

    case 'hourly': {
      const minutes = options.minutesAfterHour ?? 0;
      if (minutes < 0 || minutes >= 60) {
        throw new Error('Minutes must be between 0 and 59');
      }
      // Run at specified minutes past every hour
      return `${minutes} * * * *`;
    }

    case 'daily': {
      if (!options.dailyTime) {
        throw new Error('Daily time is required for daily schedules');
      }
      const timeMatch = options.dailyTime.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        throw new Error('Daily time must be in HH:MM format');
      }
      const [, hours, mins] = timeMatch;
      const hour = Number.parseInt(hours, 10);
      const minute = Number.parseInt(mins, 10);

      if (hour < 0 || hour > 23) {
        throw new Error('Hours must be between 0 and 23');
      }
      if (minute < 0 || minute > 59) {
        throw new Error('Minutes must be between 0 and 59');
      }

      // Run daily at specified time
      return `${minute} ${hour} * * *`;
    }

    case 'custom': {
      if (!options.cronExpression) {
        throw new Error('Cron expression is required for custom schedules');
      }
      // Basic validation of cron expression (5 parts separated by spaces)
      const cronParts = options.cronExpression.trim().split(/\s+/);
      if (cronParts.length !== 5) {
        throw new Error(
          'Cron expression must have exactly 5 parts (minute hour day month weekday)',
        );
      }
      return options.cronExpression;
    }

    default:
      throw new Error(`Unsupported frequency: ${options.frequency}`);
  }
}

/**
 * Get a human-readable description of a cron schedule
 */
export function describeCronSchedule(cronSchedule: string | null): string {
  if (!cronSchedule) {
    return 'No automatic extraction';
  }

  const parts = cronSchedule.split(' ');
  if (parts.length !== 5) {
    return `Custom schedule: ${cronSchedule}`;
  }

  const [minute, hour, day, month, weekday] = parts;

  // Check for hourly pattern (X * * * *)
  if (hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return `Every hour at ${minute} minutes past`;
  }

  // Check for daily pattern (X Y * * *)
  if (day === '*' && month === '*' && weekday === '*' && hour !== '*') {
    return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  return `Custom schedule: ${cronSchedule}`;
}

/**
 * Get default cron expression example for custom input
 */
export function getDefaultCronExample(): string {
  return '0 * * * *'; // Every hour on the hour
}
