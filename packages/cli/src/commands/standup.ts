import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadConfig, saveConfig } from '../config';
import type { Project } from '../config/types';
import { createApiClient, UnauthenticatedError } from '../api/client';
import logger from '../utils/logger';
import {
  describeCronSchedule,
} from '../utils/cron';
import { fetchStandups } from '../utils/data';
import { extractWip as extractGitWip, isGitRepository } from '../git/wip';
import { extractAchievementsFromProject } from '../lib/extraction';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Standup interface for type safety
interface Standup {
  id: string;
  name: string;
  meetingTime: string;
  timezone: string;
  daysMask: number;
  enabled: boolean;
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

    // Add standup WIP extraction for each configured standup
    for (const standup of config.standups || []) {
      // Get all projects enrolled in this standup
      const enrolledProjects = config.projects.filter(
        (p: Project) => p.standupId === standup.id
      );

      // Only add cron entry if there are enrolled projects
      if (
        enrolledProjects.length > 0 &&
        standup.enabled &&
        standup.cronSchedule
      ) {
        newEntries += `\n# BragDoc standup WIP extraction - ${
          standup.name || standup.id
        }\n`;
        newEntries += `${standup.cronSchedule} mkdir -p ~/.bragdoc/logs && "${nodePath}" "${bragdocPath}" standup wip --id ${standup.id} >> ${logFile} 2>&1\n`;
      }
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

    // Count standups with enrolled projects
    const activeStandups = (config.standups || []).filter((s: any) => {
      const enrolledCount = config.projects.filter(
        (p: Project) => p.standupId === s.id
      ).length;
      return enrolledCount > 0 && s.enabled && s.cronSchedule;
    });

    if (activeStandups.length > 0) {
      console.log(
        chalk.blue(
          `📅 ${activeStandups.length} standup WIP extraction schedule(s) installed.`
        )
      );
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

    // Install standup WIP extraction tasks
    for (const [index, standup] of (config.standups || []).entries()) {
      // Get all projects enrolled in this standup
      const enrolledProjects = config.projects.filter(
        (p: Project) => p.standupId === standup.id
      );

      // Only add task if there are enrolled projects
      if (
        enrolledProjects.length > 0 &&
        standup.enabled &&
        standup.cronSchedule
      ) {
        try {
          const schedule = convertCronToWindowsSchedule(standup.cronSchedule);
          const taskName = `BragDoc-Standup-${
            standup.name?.replace(/\s/g, '-') || index + 1
          }`;

          await execAsync(
            `schtasks /delete /tn "${taskName}" /f 2>nul || exit 0`
          );

          const command = `schtasks /create /tn "${taskName}" /tr "cmd /c if not exist \\"%USERPROFILE%\\.bragdoc\\logs\\" mkdir \\"%USERPROFILE%\\.bragdoc\\logs\\" && node \\"${bragdocPath}\\" standup wip --id ${standup.id} >> \\"${logFile}\\" 2>&1" ${schedule}`;

          await execAsync(command);
          console.log(chalk.green(`✓ Created task: ${taskName}`));
        } catch (error: any) {
          console.error(
            chalk.red(
              `Failed to create standup WIP task for ${
                standup.name || standup.id
              }:`,
              error.message
            )
          );
        }
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
 * Enroll a single project in a standup
 */
async function enrollSingleProject(
  config: any,
  project: Project,
  selectedStandup: Standup
): Promise<void> {
  // Check if project has no id field
  if (!project.id) {
    console.log(chalk.red('⨯ This project is not synced with the web app'));
    console.log(chalk.blue('💡 Run `bragdoc projects add` to sync it first'));
    return;
  }

  // Check if project already has this standupId
  if (project.standupId === selectedStandup.id) {
    console.log(
      chalk.yellow('⚠️  This project is already enrolled in this standup')
    );
    const { reconfigure } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'reconfigure',
        message: 'Do you want to reconfigure it?',
        default: false,
      },
    ]);
    if (!reconfigure) {
      return;
    }
  }

  // Set the standupId field on the project
  project.standupId = selectedStandup.id;

  // Calculate cron schedule
  const cronSchedule = calculateStandupCronSchedule(
    selectedStandup.meetingTime,
    selectedStandup.daysMask
  );

  console.log(
    chalk.blue(
      `📅 WIP extraction will run ${describeCronSchedule(cronSchedule)}`
    )
  );

  // Check if standup config already exists
  let standupConfig = config.standups.find(
    (s: any) => s.id === selectedStandup.id
  );
  if (!standupConfig) {
    standupConfig = {
      id: selectedStandup.id,
      name: selectedStandup.name,
      enabled: true,
      cronSchedule,
    };
    config.standups.push(standupConfig);
  } else {
    // Update existing config
    standupConfig.cronSchedule = cronSchedule;
    standupConfig.enabled = true;
  }

  await saveConfig(config);
  console.log(chalk.green('✓ Enrolled project in standup'));

  // Install system scheduling
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
  }
}

/**
 * Enroll multiple projects in a standup
 */
async function enrollMultipleProjects(
  config: any,
  selectedStandup: Standup
): Promise<void> {
  // Get projects that could be enrolled
  const eligibleProjects = config.projects.filter(
    (p: Project) => p.id && p.enabled
  );

  if (eligibleProjects.length === 0) {
    console.log(chalk.yellow('⚠️  No projects available to enroll'));
    console.log(
      chalk.blue(
        '💡 Run `bragdoc projects add` in your project directories first'
      )
    );
    return;
  }

  // Use inquirer with checkbox to let user select multiple projects
  const { selectedProjects } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedProjects',
      message:
        'Select projects to enroll in this standup (use spacebar to select):',
      choices: eligibleProjects.map((p: Project) => ({
        name: `${p.name || p.path}`,
        value: p.path,
        checked: p.standupId === selectedStandup.id, // Pre-check if already enrolled
      })),
    },
  ]);

  if (selectedProjects.length === 0) {
    console.log(chalk.yellow('No projects selected'));
    return;
  }

  // Calculate cron schedule
  const cronSchedule = calculateStandupCronSchedule(
    selectedStandup.meetingTime,
    selectedStandup.daysMask
  );

  console.log(
    chalk.blue(
      `📅 WIP extraction will run ${describeCronSchedule(cronSchedule)}`
    )
  );

  // For each selected project path
  for (const projectPath of selectedProjects) {
    const project = config.projects.find(
      (p: Project) => p.path === projectPath
    );
    if (project) {
      project.standupId = selectedStandup.id;
    }
  }

  // Check if standup config exists, if not create it
  let standupConfig = config.standups.find(
    (s: any) => s.id === selectedStandup.id
  );
  if (!standupConfig) {
    standupConfig = {
      id: selectedStandup.id,
      name: selectedStandup.name,
      enabled: true,
      cronSchedule,
    };
    config.standups.push(standupConfig);
  } else {
    standupConfig.cronSchedule = cronSchedule;
    standupConfig.enabled = true;
  }

  await saveConfig(config);
  console.log(
    chalk.green(`✓ Enrolled ${selectedProjects.length} project(s) in standup`)
  );

  // Install system scheduling
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
  }
}

/**
 * Enable standup WIP extraction
 */
async function enableStandup() {
  try {
    const cwd = process.cwd();
    const config = await loadConfig();

    // Find if current directory matches a project
    const currentProject = config.projects.find((p: Project) => p.path === cwd);

    // Fetch standups from API
    console.log(chalk.blue('Fetching your standups from the web app...'));
    let standups: Standup[];
    try {
      standups = (await fetchStandups({ force: true })) as any;
    } catch (error) {
      if (error instanceof UnauthenticatedError) {
        console.log(
          chalk.yellow(
            '⚠️  Not authenticated. Please run `bragdoc login` first.'
          )
        );
        return;
      }
      console.error(
        chalk.red('Failed to fetch standups:'),
        (error as Error).message
      );
      console.log(
        chalk.blue('💡 Check your internet connection and try again')
      );
      return;
    }

    if (standups.length === 0) {
      console.log(chalk.yellow('⚠️  No standups found in your account.'));
      console.log(
        chalk.blue(
          '💡 Create a standup at https://app.bragdoc.ai/standups first (takes <30 seconds).'
        )
      );
      return;
    }

    // Prompt user to select a standup
    const { selectedStandupId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedStandupId',
        message: 'Which standup would you like to configure?',
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

    // Branch logic based on whether in project directory
    if (currentProject) {
      await enrollSingleProject(config, currentProject, selectedStandup);
    } else {
      await enrollMultipleProjects(config, selectedStandup);
    }
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return;
    }
    throw error;
  }
}

/**
 * Disable standup WIP extraction
 */
async function disableStandup() {
  const cwd = process.cwd();
  const config = await loadConfig();

  // Find current project
  const project = config.projects.find((p: Project) => p.path === cwd);

  if (!project) {
    console.log(chalk.red('⨯ Current directory is not a configured project'));
    console.log(
      chalk.blue(
        '💡 Run this command from within a project directory, or use `bragdoc projects list` to see configured projects'
      )
    );
    return;
  }

  if (!project.standupId) {
    console.log(
      chalk.yellow('⚠️  This project is not enrolled in any standup')
    );
    return;
  }

  const standupId = project.standupId;

  // Remove the standupId from project
  project.standupId = undefined;

  // Check if any other projects are still using this standup
  const stillUsed = config.projects.some(
    (p: Project) => p.standupId === standupId
  );

  // If no other projects use this standup, optionally remove from config.standups
  if (!stillUsed) {
    const standupIndex = config.standups.findIndex(
      (s: any) => s.id === standupId
    );
    if (standupIndex !== -1) {
      config.standups.splice(standupIndex, 1);
    }
  }

  await saveConfig(config);
  console.log(chalk.green('✓ Unenrolled project from standup'));

  // Update system scheduling
  console.log(chalk.blue('🔧 Updating system scheduling...'));
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
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

  // Check if any standups configured
  if (config.standups.length === 0) {
    console.log(chalk.yellow('No standups configured.'));
    console.log(
      chalk.blue(
        '💡 Run `bragdoc standup enable` to set up standup WIP extraction.'
      )
    );
    return;
  }

  // For each standup in config.standups
  for (const standup of config.standups) {
    console.log(chalk.bold(`\nStandup: ${standup.name || standup.id}`));
    const status = standup.enabled
      ? chalk.green('Enabled')
      : chalk.red('Disabled');
    console.log(`  Status: ${status}`);
    console.log(
      `  Schedule: ${describeCronSchedule(standup.cronSchedule || null)}`
    );

    // Get enrolled projects
    const enrolledProjects = config.projects.filter(
      (p: Project) => p.standupId === standup.id
    );
    console.log(`  Enrolled projects: ${enrolledProjects.length}`);

    // List project names (up to 5, then "and X more")
    if (enrolledProjects.length > 0) {
      const projectNames = enrolledProjects
        .map((p: Project) => `    - ${p.name || p.path}`)
        .slice(0, 5);

      console.log(projectNames.join('\n'));

      if (enrolledProjects.length > 5) {
        console.log(`    ... and ${enrolledProjects.length - 5} more`);
      }
    }
  }

  console.log('');
}

/**
 * Extract and submit WIP for standup
 */
async function extractAndSubmitStandupWip(options: { id?: string } = {}) {
  try {
    const config = await loadConfig();
    const cwd = process.cwd();
    let standupId: string | undefined = options.id;

    // If standupId not provided, try to determine from current directory
    if (!standupId) {
      const project = config.projects.find((p: Project) => p.path === cwd);
      if (project?.standupId) {
        standupId = project.standupId;
      } else if (project && !project.standupId) {
        console.log(chalk.red('⨯ This project is not enrolled in a standup'));
        console.log(chalk.blue('💡 Run `bragdoc standup enable` first'));
        return;
      }
    }

    // If still no standup ID, check how many standups are configured
    if (!standupId) {
      if (config.standups.length === 0) {
        console.log(chalk.yellow('⚠️  No standups configured'));
        console.log(chalk.blue('💡 Run `bragdoc standup enable` first'));
        return;
      } else if (config.standups.length === 1) {
        standupId = config.standups[0].id;
      } else {
        // Multiple standups - prompt user to select
        const { selectedStandupId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedStandupId',
            message: 'Which standup do you want to extract WIP for?',
            choices: config.standups.map((s: any) => ({
              name: `${s.name || s.id}`,
              value: s.id,
            })),
          },
        ]);
        standupId = selectedStandupId;
      }
    }

    // Get enrolled projects for this standup
    const enrolledProjects = config.projects.filter(
      (p: Project) => p.standupId === standupId && p.enabled
    );

    if (enrolledProjects.length === 0) {
      console.log(chalk.yellow('⚠️  No projects enrolled in this standup'));
      return;
    }

    // Get standup configuration
    const standupConfig = config.standups.find((s: any) => s.id === standupId);
    const maxConcurrentExtracts = standupConfig?.maxConcurrentExtracts ?? 3;
    const maxConcurrentWips = standupConfig?.maxConcurrentWips ?? 3;

    console.log(
      chalk.blue(
        `📊 Extracting achievements from ${enrolledProjects.length} enrolled project(s)...`
      )
    );

    // Dynamically import p-limit (ESM module)
    const pLimit = (await import('p-limit')).default;

    // Create concurrency limits
    const extractLimit = pLimit(maxConcurrentExtracts);

    // Extract achievements from all enrolled projects
    const extractPromises = enrolledProjects.map((project) =>
      extractLimit(async () => {
        try {
          console.log(
            chalk.dim(`  Extracting from ${project.name || project.path}...`)
          );
          const result = await extractAchievementsFromProject(project.path, {
            maxCommits: project.maxCommits,
          });
          if (result.success && result.count && result.count > 0) {
            console.log(
              chalk.green(
                `  ✓ ${project.name || project.path}: ${result.count} achievement(s)`
              )
            );
          }
          return { success: result.success, project: project.name || project.path };
        } catch (error: any) {
          console.error(
            chalk.red(
              `  Failed to extract from ${project.name || project.path}: ${error.message}`
            )
          );
          return { success: false, project: project.name || project.path, error };
        }
      })
    );

    const extractResults = await Promise.all(extractPromises);
    const successfulExtracts = extractResults.filter((r) => r.success).length;
    console.log(
      chalk.green(
        `✓ Completed achievement extraction (${successfulExtracts}/${enrolledProjects.length} successful)`
      )
    );

    // Extract WIP from all enrolled projects
    console.log(
      chalk.blue('📝 Extracting work-in-progress from enrolled projects...')
    );

    const wipLimit = pLimit(maxConcurrentWips);
    const wipPromises = enrolledProjects.map((project) =>
      wipLimit(async () => {
        try {
          if (!isGitRepository(project.path)) {
            console.warn(
              chalk.yellow(
                `  Skipping ${
                  project.name || project.path
                } (not a git repository)`
              )
            );
            return null;
          }

          const wipInfo = extractGitWip(project.path);
          if (!wipInfo.hasChanges) {
            return null; // No changes
          }

          return {
            projectName: project.name || project.path,
            summary: wipInfo.summary,
          };
        } catch (error: any) {
          console.error(
            chalk.red(
              `  Failed to extract WIP from ${project.name || project.path}: ${
                error.message
              }`
            )
          );
          return null;
        }
      })
    );

    const wipResults = await Promise.all(wipPromises);
    const validWips = wipResults.filter((w) => w !== null);

    // Concatenate and format all WIP summaries
    if (validWips.length === 0) {
      console.log(chalk.yellow('No uncommitted changes found in any project'));
      return;
    }

    const combinedWip = validWips
      .map((w) => {
        return `## ${w!.projectName}\n\n${w!.summary}`;
      })
      .join('\n\n---\n\n');

    console.log(
      chalk.green(`✓ Found changes in ${validWips.length} project(s)`)
    );

    // Send combined WIP to API
    const apiClient = await createApiClient();

    if (!apiClient.isAuthenticated()) {
      console.log(
        chalk.yellow('⚠️  Not authenticated. Skipping API submission.')
      );
      console.log(
        chalk.blue('💡 Run `bragdoc login` to submit WIP to your standup.')
      );
      return;
    }

    console.log(chalk.blue('📤 Submitting WIP to standup...'));

    await apiClient.post(`/api/standups/${standupId}/wip`, {
      wip: combinedWip,
    });

    console.log(chalk.green('✓ WIP submitted successfully!'));
    console.log(chalk.blue('View at: https://app.bragdoc.ai/standups'));
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
      .option('--id <standupId>', 'Standup ID to extract WIP for')
      .action(extractAndSubmitStandupWip)
  );
