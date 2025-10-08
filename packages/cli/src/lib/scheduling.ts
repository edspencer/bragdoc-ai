import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Calculate cron schedule for standup WIP extraction
 * Subtracts 10 minutes from meeting time to extract before standup
 */
export function calculateStandupCronSchedule(
  meetingTime: string,
  daysMask: number
): string {
  // Parse meeting time (HH:MM format)
  const [hoursStr, minsStr] = meetingTime.split(':');
  let hours = Number.parseInt(hoursStr, 10);
  let mins = Number.parseInt(minsStr, 10);

  // Subtract 10 minutes
  mins -= 10;
  if (mins < 0) {
    mins += 60;
    hours -= 1;
    if (hours < 0) {
      hours += 24;
    }
  }

  // Convert daysMask to weekday string
  // daysMask uses: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
  // cron uses: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const daysMap = [
    { mask: 1, cron: 1 }, // Mon
    { mask: 2, cron: 2 }, // Tue
    { mask: 4, cron: 3 }, // Wed
    { mask: 8, cron: 4 }, // Thu
    { mask: 16, cron: 5 }, // Fri
    { mask: 32, cron: 6 }, // Sat
    { mask: 64, cron: 0 }, // Sun
  ];

  const weekdaysList: number[] = [];
  for (const day of daysMap) {
    if (daysMask & day.mask) {
      weekdaysList.push(day.cron);
    }
  }

  const weekdays = weekdaysList.sort().join(',');

  // Build cron expression: minute hour * * weekdays
  return `${mins} ${hours} * * ${weekdays}`;
}

/**
 * Get existing crontab content and remove BragDoc entries
 */
export async function getCleanedCrontab(): Promise<string> {
  try {
    const { stdout } = await execAsync('crontab -l 2>/dev/null || true');
    const lines = stdout.split('\n');
    const filteredLines = [];
    let skipBragDocSection = false;

    for (const line of lines) {
      if (
        line.trim() === '# BragDoc automatic extractions' ||
        line.trim() === '# BragDoc standup WIP extraction' ||
        line.includes('# BragDoc standup WIP extraction -')
      ) {
        skipBragDocSection = true;
        continue;
      }
      if (skipBragDocSection && (line.startsWith('#') || line.trim() === '')) {
        if (line.startsWith('#') && !line.includes('BragDoc')) {
          skipBragDocSection = false;
          filteredLines.push(line);
        }
        continue;
      }
      if (skipBragDocSection && line.trim() !== '') {
        continue; // Skip BragDoc cron entries
      }
      if (!skipBragDocSection) {
        filteredLines.push(line);
      }
    }

    let cleaned = filteredLines.join('\n').replace(/\n+$/, ''); // Remove trailing newlines
    if (cleaned && !cleaned.endsWith('\n')) {
      cleaned += '\n';
    }
    return cleaned;
  } catch {
    return '';
  }
}

/**
 * Check if BragDoc entries exist in crontab
 */
export async function checkExistingCrontab(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('crontab -l 2>/dev/null || true');
    return stdout.includes('bragdoc extract') || stdout.includes('bragdoc standup');
  } catch {
    return false;
  }
}

/**
 * Convert cron day number to Windows day name
 */
export function convertCronDayToWindows(cronDay: string): string {
  const dayMap: Record<string, string> = {
    '0': 'SUN',
    '7': 'SUN', // Sunday
    '1': 'MON',
    '2': 'TUE',
    '3': 'WED',
    '4': 'THU',
    '5': 'FRI',
    '6': 'SAT',
  };
  return dayMap[cronDay] || 'SUN';
}

/**
 * Convert cron schedule to Windows Task Scheduler parameters
 * Consolidated version supporting both hourly and weekly schedules
 */
export function convertCronToWindowsSchedule(cronSchedule: string): {
  schedule: string;
  warning?: string;
} {
  const [minute, hour, day, month, weekday] = cronSchedule.split(' ');

  // Hourly schedule
  if (hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return {
      schedule: `/sc hourly /mo 1 /st 00:${minute.padStart(2, '0')}`,
    };
  }

  // Daily schedule (most common case)
  if (day === '*' && month === '*' && weekday === '*' && hour !== '*') {
    return {
      schedule: `/sc daily /st ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
    };
  }

  // Weekly schedule (if weekday is specified)
  if (
    day === '*' &&
    month === '*' &&
    weekday !== '*' &&
    weekday !== '0-6'
  ) {
    // Convert comma-separated weekdays to Windows format
    const weekdaysList = weekday.split(',');
    const windowsDays = weekdaysList
      .map((d) => {
        const dayMap: Record<string, string> = {
          '0': 'SUN',
          '1': 'MON',
          '2': 'TUE',
          '3': 'WED',
          '4': 'THU',
          '5': 'FRI',
          '6': 'SAT',
        };
        return dayMap[d] || 'SUN';
      })
      .join(',');

    return {
      schedule: `/sc weekly /d ${windowsDays} /st ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
    };
  }

  // Default to daily if we can't parse it properly
  return {
    schedule: `/sc daily /st ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`,
    warning: `Complex cron schedule "${cronSchedule}" converted to daily at specified time.`,
  };
}
