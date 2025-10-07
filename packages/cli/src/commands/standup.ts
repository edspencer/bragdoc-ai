import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadConfig, saveConfig } from '../config';
import { createApiClient, UnauthenticatedError } from '../api/client';
import logger from '../utils/logger';
import {
  describeCronSchedule,
  type CronOptions,
  convertToCronSchedule,
} from '../utils/cron';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Fetch available standups from the API
 */
async function fetchStandups() {
  const apiClient = await createApiClient();

  if (!apiClient.isAuthenticated()) {
    console.log(chalk.yellow('⚠️  Not logged in. Run `bragdoc login` first.'));
    throw new UnauthenticatedError();
  }

  interface Standup {
    id: string;
    name: string;
    meetingTime: string;
    timezone: string;
    daysMask: number;
    enabled: boolean;
  }

  const { standups } = await apiClient.get<{ standups: Standup[] }>(
    '/api/standups'
  );
  return standups;
}

/**
 * Calculate cron schedule for standup (10 minutes before meeting time)
 */
function calculateStandupCronSchedule(
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
async function getCleanedCrontab(): Promise<string> {
  try {
    const { stdout } = await execAsync('crontab -l 2>/dev/null || true');
    const lines = stdout.split('\n');
    const filteredLines = [];
    let skipBragDocSection = false;

    for (const line of lines) {
      if (
        line.trim() === '# BragDoc automatic extractions' ||
        line.trim() === '# BragDoc standup WIP extraction'
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
 * Install or update system crontab entries (Unix/Linux/Mac)
 */
async function installSystemCrontab(): Promise<void> {
  try {
    const config = await loadConfig();

    // Get cleaned crontab (without BragDoc entries)
    const existingCrontab = await getCleanedCrontab();

    // Generate repository extraction entries
    const scheduledRepos = config.projects.filter(
      (r) => r.enabled && r.cronSchedule
    );

    const bragdocPath = process.argv[1];
    const nodePath = process.execPath;
    const logFile = '~/.bragdoc/logs/combined.log';

    let newEntries = '';

    // Add repository extractions if any
    if (scheduledRepos.length > 0) {
      newEntries += '\n# BragDoc automatic extractions\n';
      for (const repo of scheduledRepos) {
        newEntries += `${repo.cronSchedule} mkdir -p ~/.bragdoc/logs && cd "${repo.path}" && "${nodePath}" "${bragdocPath}" extract >> ${logFile} 2>&1\n`;
      }
    }

    // Add standup WIP extraction if configured
    if (config.standup?.enabled && config.standup?.cronSchedule) {
      newEntries += '\n# BragDoc standup WIP extraction\n';
      const repoPath = config.standup.repositoryPath || '.';
      newEntries += `${config.standup.cronSchedule} mkdir -p ~/.bragdoc/logs && cd "${repoPath}" && "${nodePath}" "${bragdocPath}" standup wip >> ${logFile} 2>&1\n`;
    }

    // Create new crontab content
    const newCrontab = existingCrontab + newEntries;

    // Install new crontab
    await execAsync(`echo '${newCrontab.replace(/'/g, "'\\''")}' | crontab -`);

    console.log(chalk.green('✓ System scheduling updated successfully!'));
    if (scheduledRepos.length > 0) {
      console.log(
        chalk.blue(
          `📅 ${scheduledRepos.length} automatic extraction schedule(s) installed.`
        )
      );
    }
    if (config.standup?.enabled && config.standup?.cronSchedule) {
      console.log(chalk.blue('📅 Standup WIP extraction schedule installed.'));
    }
    console.log(
      chalk.blue('💡 Run `crontab -l` to view your installed schedules.')
    );
  } catch (error: any) {
    console.error(
      chalk.red('Failed to install crontab entries:'),
      error.message
    );
    throw error;
  }
}

/**
 * Convert cron schedule to Windows Task Scheduler parameters
 */
function convertCronToWindowsSchedule(cronSchedule: string): string {
  const [minute, hour, day, month, weekday] = cronSchedule.split(' ');

  // Daily schedule (most common case)
  if (day === '*' && month === '*' && weekday === '*' && hour !== '*') {
    return `/sc daily /st ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  // Weekly schedule (if weekday is specified)
  if (
    day === '*' &&
    month === '*' &&
    weekday !== '*' &&
    weekday !== '0-6' &&
    weekday !== '*'
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

    return `/sc weekly /d ${windowsDays} /st ${hour.padStart(
      2,
      '0'
    )}:${minute.padStart(2, '0')}`;
  }

  // Default to daily if we can't parse it properly
  console.log(
    chalk.yellow(
      `⚠️  Complex cron schedule "${cronSchedule}" converted to daily at specified time.`
    )
  );
  return `/sc daily /st ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

/**
 * Install or update Windows Task Scheduler entries
 */
async function installWindowsScheduling(): Promise<void> {
  try {
    const config = await loadConfig();
    const bragdocPath = process.argv[1].replace(/\\/g, '\\\\');
    const logFile = '%USERPROFILE%\\.bragdoc\\logs\\combined.log';

    // Install repository extraction tasks
    const scheduledRepos = config.projects.filter(
      (r) => r.enabled && r.cronSchedule
    );

    for (const [index, repo] of scheduledRepos.entries()) {
      try {
        const schedule = convertCronToWindowsSchedule(repo.cronSchedule!);
        const taskName = `BragDoc-Extract-${index + 1}`;

        await execAsync(
          `schtasks /delete /tn "${taskName}" /f 2>nul || exit 0`
        );

        const command = `schtasks /create /tn "${taskName}" /tr "cmd /c if not exist \\"%USERPROFILE%\\.bragdoc\\logs\\" mkdir \\"%USERPROFILE%\\.bragdoc\\logs\\" && cd /d \\"${repo.path}\\" && node \\"${bragdocPath}\\" extract >> \\"${logFile}\\" 2>&1" ${schedule}`;

        await execAsync(command);
        console.log(
          chalk.green(`✓ Created task: ${taskName} for ${repo.path}`)
        );
      } catch (error: any) {
        console.error(
          chalk.red(`Failed to create task for ${repo.path}:`, error.message)
        );
      }
    }

    // Install standup WIP extraction task
    if (config.standup?.enabled && config.standup?.cronSchedule) {
      try {
        const schedule = convertCronToWindowsSchedule(
          config.standup.cronSchedule
        );
        const taskName = 'BragDoc-Standup-WIP';
        const repoPath = config.standup.repositoryPath || '.';

        await execAsync(
          `schtasks /delete /tn "${taskName}" /f 2>nul || exit 0`
        );

        const command = `schtasks /create /tn "${taskName}" /tr "cmd /c if not exist \\"%USERPROFILE%\\.bragdoc\\logs\\" mkdir \\"%USERPROFILE%\\.bragdoc\\logs\\" && cd /d \\"${repoPath}\\" && node \\"${bragdocPath}\\" standup wip >> \\"${logFile}\\" 2>&1" ${schedule}`;

        await execAsync(command);
        console.log(chalk.green(`✓ Created task: ${taskName}`));
      } catch (error: any) {
        console.error(
          chalk.red('Failed to create standup WIP task:', error.message)
        );
      }
    }

    console.log(chalk.green('✓ Windows Task Scheduler setup completed!'));
    console.log(
      chalk.blue('💡 Run `schtasks /query /tn BragDoc*` to view your tasks.')
    );
  } catch (error: any) {
    console.error(chalk.red('Failed to install Windows tasks:'), error.message);
    throw error;
  }
}

/**
 * Enable standup WIP extraction
 */
async function enableStandup() {
  try {
    const config = await loadConfig();

    // Check if already enabled
    if (config.standup?.enabled) {
      console.log(chalk.yellow('⚠️  Standup is already enabled.'));
      console.log(
        chalk.blue(
          `Current schedule: ${describeCronSchedule(
            config.standup.cronSchedule || null
          )}`
        )
      );

      const { continueAnyway } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueAnyway',
          message: 'Do you want to reconfigure it?',
          default: false,
        },
      ]);

      if (!continueAnyway) {
        return;
      }
    }

    // Fetch standups from API
    console.log(chalk.blue('Fetching your standups from the web app...'));
    const standups = await fetchStandups();

    console.log(standups);

    if (standups.length === 0) {
      console.log(chalk.yellow('⚠️  No standups found in your account.'));
      console.log(
        chalk.blue(
          '💡 Create a standup at https://www.bragdoc.ai/standup first.'
        )
      );
      return;
    }

    // Let user select a standup
    const { selectedStandupId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedStandupId',
        message: 'Which standup do you want to enable WIP extraction for?',
        choices: standups.map((s) => ({
          name: `${s.name} (${s.meetingTime} ${s.timezone})`,
          value: s.id,
        })),
      },
    ]);

    const selectedStandup = standups.find((s) => s.id === selectedStandupId);
    if (!selectedStandup) {
      throw new Error('Selected standup not found');
    }

    // Calculate cron schedule (10 minutes before standup time)
    const cronSchedule = calculateStandupCronSchedule(
      selectedStandup.meetingTime,
      selectedStandup.daysMask
    );

    console.log(
      chalk.blue(
        `📅 WIP extraction will run ${describeCronSchedule(cronSchedule)}`
      )
    );

    // Optionally let user specify a repository path
    const { useCurrentDir } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useCurrentDir',
        message: 'Extract WIP from the current directory when running?',
        default: true,
      },
    ]);

    let repositoryPath: string | undefined;
    if (!useCurrentDir) {
      const { customPath } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customPath',
          message: 'Enter the repository path:',
          default: process.cwd(),
        },
      ]);
      repositoryPath = customPath;
    }

    // Save standup config
    config.standup = {
      enabled: true,
      standupId: selectedStandup.id,
      standupName: selectedStandup.name,
      cronSchedule,
      repositoryPath,
    };

    await saveConfig(config);

    console.log(
      chalk.green(
        `✓ Enabled standup WIP extraction for "${selectedStandup.name}"`
      )
    );

    // Install system scheduling
    console.log(chalk.blue('🔧 Setting up automatic WIP extraction...'));

    const isWindows = process.platform === 'win32';
    try {
      if (isWindows) {
        await installWindowsScheduling();
      } else {
        await installSystemCrontab();
      }
    } catch (error: any) {
      console.error(
        chalk.red('Failed to set up automatic scheduling:'),
        error.message
      );
      console.log(
        chalk.yellow(
          '⚠️  WIP extraction is configured but automatic scheduling failed.'
        )
      );
      console.log(
        chalk.blue(
          '💡 You can manually run `bragdoc standup wip` to extract WIP.'
        )
      );
    }
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return; // Already logged in fetchStandups
    }
    throw error;
  }
}

/**
 * Disable standup WIP extraction
 */
async function disableStandup() {
  const config = await loadConfig();

  if (!config.standup?.enabled) {
    console.log(chalk.yellow('⚠️  Standup is not enabled.'));
    return;
  }

  // Disable standup
  config.standup.enabled = false;

  await saveConfig(config);

  console.log(chalk.green('✓ Disabled standup WIP extraction'));

  // Update system scheduling to remove standup entry
  console.log(chalk.blue('🔧 Updating system scheduling...'));
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      // Delete the standup task
      await execAsync(
        'schtasks /delete /tn "BragDoc-Standup-WIP" /f 2>nul || exit 0'
      );
      // Reinstall other tasks
      await installWindowsScheduling();
    } else {
      await installSystemCrontab();
    }
    console.log(chalk.green('✓ System scheduling updated'));
  } catch (error: any) {
    console.error(
      chalk.red('Failed to update system scheduling:'),
      error.message
    );
  }
}

/**
 * Show standup status
 */
async function showStatus() {
  const config = await loadConfig();

  if (!config.standup) {
    console.log(chalk.yellow('No standup configured.'));
    console.log(
      chalk.blue(
        '💡 Run `bragdoc standup enable` to set up automatic WIP extraction.'
      )
    );
    return;
  }

  const status = config.standup.enabled
    ? chalk.green('Enabled')
    : chalk.red('Disabled');
  const schedule = describeCronSchedule(config.standup.cronSchedule || null);
  const repoPath = config.standup.repositoryPath || 'current directory';

  console.log(chalk.bold('\nStandup Configuration:'));
  console.log(`  Status: ${status}`);
  console.log(
    `  Standup: ${config.standup.standupName || config.standup.standupId}`
  );
  console.log(`  Schedule: ${schedule}`);
  console.log(`  Repository: ${repoPath}`);
  console.log('');
}

/**
 * Extract and submit WIP
 */
async function extractWip() {
  try {
    const config = await loadConfig();

    // Check if standup is configured
    if (!config.standup || !config.standup.enabled) {
      console.log(chalk.yellow('⚠️  Standup is not enabled.'));
      console.log(
        chalk.blue(
          '💡 Run `bragdoc standup enable` to set up automatic WIP extraction.'
        )
      );
      return;
    }

    // Import git utilities
    const { extractWip: extractGitWip, isGitRepository } = await import(
      '../git/wip.js'
    );

    // Determine repository path
    const repoPath = config.standup.repositoryPath || process.cwd();

    // Check if it's a git repository
    if (!isGitRepository(repoPath)) {
      console.log(chalk.red(`⨯ Not a git repository: ${repoPath}`));
      console.log(
        chalk.blue(
          '💡 Make sure you are in a git repository or configure a repository path.'
        )
      );
      return;
    }

    console.log(chalk.blue('📝 Extracting work-in-progress from git...'));

    // Extract WIP
    const wipInfo = extractGitWip(repoPath);

    if (!wipInfo.hasChanges) {
      console.log(chalk.yellow('No uncommitted changes found.'));
      return;
    }

    console.log(chalk.green('✓ Found changes:'));
    console.log(wipInfo.summary);

    // Send to API
    const apiClient = await createApiClient();

    if (!apiClient.isAuthenticated()) {
      console.log(chalk.yellow('⚠️  Not logged in. Skipping API submission.'));
      console.log(
        chalk.blue('💡 Run `bragdoc login` to submit WIP to your standup.')
      );
      return;
    }

    console.log(chalk.blue('📤 Submitting WIP to standup...'));

    await apiClient.post(`/api/standups/${config.standup.standupId}/wip`, {
      wip: wipInfo.summary,
    });

    console.log(chalk.green('✓ WIP submitted successfully!'));
    console.log(chalk.blue(`View at: https://www.bragdoc.ai/standup`));
  } catch (error: any) {
    logger.error('Error extracting WIP:', error);
    console.error(chalk.red('Failed to extract WIP:'), error.message);
  }
}

export const standupCommand = new Command('standup')
  .description('Manage standup WIP extraction')
  .addCommand(
    new Command('enable')
      .description('Enable automatic WIP extraction before standup')
      .action(enableStandup)
  )
  .addCommand(
    new Command('disable')
      .description('Disable automatic WIP extraction')
      .action(disableStandup)
  )
  .addCommand(
    new Command('status')
      .description('Show standup configuration status')
      .action(showStatus)
  )
  .addCommand(
    new Command('wip')
      .description('Extract and submit current WIP')
      .action(extractWip)
  );
