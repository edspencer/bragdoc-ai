import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadConfig, saveConfig } from '../config';
import { validateRepository } from '../utils/git';
import type { Project } from '../config/types';
import {
  convertToCronSchedule,
  describeCronSchedule,
  getDefaultCronExample,
  type ScheduleFrequency,
  type CronOptions,
} from '../utils/cron';
import { resolve } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { getRepositoryInfo, getRepositoryName } from '../git/operations';
import {
  checkExistingCrontab,
  getCleanedCrontab,
  convertCronToWindowsSchedule,
} from '../lib/scheduling';
import { syncProjectWithApi as syncProjectWithApiLib } from '../lib/projects';

const execAsync = promisify(exec);

/**
 * Normalize a repository path to an absolute path
 */
export function normalizeRepoPath(path: string): string {
  return resolve(path);
}

/**
 * Sync project with the API - find existing or create new project
 * Returns the projectId if successful, undefined if user not authenticated
 */
async function syncProjectWithApi(
  repoPath: string,
  repoName: string
): Promise<string | undefined> {
  const result = await syncProjectWithApiLib(repoPath, repoName);

  // Display message based on result
  if (result.type === 'warning') {
    console.log(chalk.yellow(`⚠️  ${result.message}`));
  } else if (result.type === 'error') {
    console.error(chalk.red(result.message));
  } else if (result.type === 'success') {
    if (result.existed) {
      console.log(chalk.green(`✓ ${result.message}`));
    } else {
      console.log(chalk.blue('Creating new project in the web app...'));
      console.log(chalk.green(`✓ ${result.message}`));
    }
  }

  return result.projectId;
}

/**
 * Prompt user for cron schedule configuration
 */
export async function promptForCronSchedule(): Promise<string | null> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'frequency',
      message: 'Automatically extract achievements?',
      choices: [
        { name: 'No', value: 'no' },
        { name: 'Hourly', value: 'hourly' },
        { name: 'Daily', value: 'daily' },
        { name: 'Custom', value: 'custom' },
      ],
      default: 'no',
    },
  ]);

  const frequency: ScheduleFrequency = answers.frequency;

  const cronOptions: CronOptions = { frequency };

  if (frequency === 'hourly') {
    const hourlyQuestions = await inquirer.prompt([
      {
        type: 'input',
        name: 'minutes',
        message: 'How many minutes past the hour?',
        default: '0',
        validate: (input: string) => {
          const num = Number.parseInt(input, 10);
          if (Number.isNaN(num) || num < 0 || num >= 60) {
            return 'Please enter a number between 0 and 59';
          }
          return true;
        },
      },
    ]);
    cronOptions.minutesAfterHour = Number.parseInt(hourlyQuestions.minutes, 10);
  } else if (frequency === 'daily') {
    const dailyQuestions = await inquirer.prompt([
      {
        type: 'input',
        name: 'time',
        message: 'What time of day? (HH:MM)',
        default: '18:00',
        validate: (input: string) => {
          const timeMatch = input.match(/^(\d{1,2}):(\d{2})$/);
          if (!timeMatch) {
            return 'Please enter time in HH:MM format';
          }
          const [, hours, mins] = timeMatch;
          const hour = Number.parseInt(hours, 10);
          const minute = Number.parseInt(mins, 10);

          if (hour < 0 || hour > 23) {
            return 'Hours must be between 0 and 23';
          }
          if (minute < 0 || minute > 59) {
            return 'Minutes must be between 0 and 59';
          }
          return true;
        },
      },
    ]);
    cronOptions.dailyTime = dailyQuestions.time;
  } else if (frequency === 'custom') {
    const customQuestions = await inquirer.prompt([
      {
        type: 'input',
        name: 'cronExpression',
        message: 'Enter cron expression (minute hour day month weekday):',
        default: getDefaultCronExample(),
        validate: (input: string) => {
          const cronParts = input.trim().split(/\s+/);
          if (cronParts.length !== 5) {
            return 'Cron expression must have exactly 5 parts (minute hour day month weekday)';
          }
          return true;
        },
      },
    ]);
    cronOptions.cronExpression = customQuestions.cronExpression;
  }

  return convertToCronSchedule(cronOptions);
}

/**
 * Install system-level crontab entries (project extractions only)
 */
async function installSystemCrontab(): Promise<void> {
  try {
    const config = await loadConfig();
    const scheduledRepos = config.projects.filter(
      (r) => r.enabled && r.cronSchedule
    );

    if (scheduledRepos.length === 0) {
      console.log(chalk.yellow('No scheduled projects to install.'));
      return;
    }

    // Get cleaned crontab (without BragDoc entries)
    const existingCrontab = await getCleanedCrontab();

    // Generate new crontab entries
    const bragdocPath = process.argv[1];
    const nodePath = process.execPath;
    let newEntries = '\n# BragDoc automatic extractions\n';

    const logFile = '~/.bragdoc/logs/combined.log';
    for (const repo of scheduledRepos) {
      newEntries += `${repo.cronSchedule} mkdir -p ~/.bragdoc/logs && cd "${repo.path}" && "${nodePath}" "${bragdocPath}" extract >> ${logFile} 2>&1\n`;
    }

    // Create new crontab content
    const newCrontab = existingCrontab + newEntries;

    // Install new crontab
    await execAsync(`echo '${newCrontab.replace(/'/g, "'\\''")}' | crontab -`);

    console.log(chalk.green('✓ System scheduling installed successfully!'));
    console.log(
      chalk.blue(
        `📅 Added ${scheduledRepos.length} automatic extraction schedules.`
      )
    );
    console.log(
      chalk.blue('💡 Run `crontab -l` to view your installed schedules.')
    );
  } catch (error: any) {
    console.error(
      chalk.red('Failed to install crontab entries:'),
      error.message
    );
    console.log(
      chalk.blue(
        '💡 You can manually run `bragdoc install crontab` to try again.'
      )
    );
  }
}

/**
 * Install Windows Task Scheduler entries (project extractions only)
 */
async function installWindowsScheduling(): Promise<void> {
  try {
    const config = await loadConfig();
    const scheduledRepos = config.projects.filter(
      (r) => r.enabled && r.cronSchedule
    );

    if (scheduledRepos.length === 0) {
      console.log(chalk.yellow('No scheduled projects to install.'));
      return;
    }

    const bragdocPath = process.argv[1].replace(/\\/g, '\\\\');
    const logFile = '%USERPROFILE%\\.bragdoc\\logs\\combined.log';

    for (const [index, repo] of scheduledRepos.entries()) {
      try {
        const { schedule, warning } = convertCronToWindowsSchedule(repo.cronSchedule!);
        if (warning) {
          console.log(chalk.yellow(`⚠️  ${warning}`));
        }
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

    console.log(chalk.green('✓ Windows Task Scheduler setup completed!'));
    console.log(
      chalk.blue('💡 Run `schtasks /query /tn BragDoc*` to view your tasks.')
    );
  } catch (error: any) {
    console.error(chalk.red('Failed to install Windows tasks:'), error.message);
  }
}

/**
 * Ensure system-level scheduling is set up for automatic extractions
 */
async function ensureSystemScheduling(): Promise<void> {
  try {
    // Check if crontab already has bragdoc entries
    const hasExistingCron = await checkExistingCrontab();

    if (!hasExistingCron) {
      console.log(
        chalk.blue('🔧 Setting up automatic extraction scheduling...'),
      );

      // Simple choice: crontab for Unix-like, Task Scheduler for Windows
      const isWindows = process.platform === 'win32';
      const recommendedMethod = isWindows
        ? 'Windows Task Scheduler'
        : 'System crontab';

      const setupChoice = await inquirer.prompt([
        {
          type: 'list',
          name: 'method',
          message: 'How would you like to set up automatic scheduling?',
          choices: [
            {
              name: `${recommendedMethod} (recommended)`,
              value: isWindows ? 'windows' : 'crontab',
            },
            { name: 'Skip for now (manual setup later)', value: 'skip' },
          ],
          default: isWindows ? 'windows' : 'crontab',
        },
      ]);

      if (
        setupChoice.method === 'crontab' ||
        setupChoice.method === 'windows'
      ) {
        // Automatically install system scheduling
        if (setupChoice.method === 'crontab') {
          await installSystemCrontab();
        } else {
          await installWindowsScheduling();
        }
      } else {
        console.log(chalk.yellow('⚠️  Automatic extractions not enabled.'));
      }
    } else {
      console.log(chalk.green('✓ System scheduling already configured.'));
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not set up automatic scheduling.'));
    console.log(
      chalk.blue('💡 Run `bragdoc install crontab` manually when ready.'),
    );
  }
}

/**
 * Check if crontab already has bragdoc entries
 */
export const projectsCommand = new Command('projects')
  .description('Manage projects for bragdoc')
  .addCommand(
    new Command('list')
      .description('List all configured projects')
      .action(listProjects),
  )
  .addCommand(
    new Command('add')
      .description('Add a project to bragdoc')
      .argument('[path]', 'Path to repository (defaults to current directory)')
      .option('-n, --name <name>', 'Friendly name for the repository')
      .option(
        '-m, --max-commits <number>',
        'Maximum number of commits to extract',
      )
      .action(addProject),
  )
  .addCommand(
    new Command('remove')
      .description('Remove a project from bragdoc')
      .argument('[path]', 'Path to repository (defaults to current directory)')
      .action(removeProject),
  )
  .addCommand(
    new Command('update')
      .description('Update project settings')
      .argument('[path]', 'Path to repository (defaults to current directory)')
      .option('-n, --name <name>', 'Update friendly name')
      .option('-m, --max-commits <number>', 'Update maximum commits')
      .option('-s, --schedule', 'Update automatic extraction schedule')
      .action(updateProject),
  )
  .addCommand(
    new Command('enable')
      .description('Enable a project')
      .argument('[path]', 'Path to repository (defaults to current directory)')
      .action((path) => toggleProject(path, true)),
  )
  .addCommand(
    new Command('disable')
      .description('Disable a project')
      .argument('[path]', 'Path to repository (defaults to current directory)')
      .action((path) => toggleProject(path, false)),
  );

/**
 * Format project for display
 */
function formatProject(project: Project, defaultMaxCommits: number): string {
  const status = project.enabled ? chalk.green('✓') : chalk.red('⨯');
  const name = project.name ? `${project.name} ` : '';
  const maxCommits = project.maxCommits || defaultMaxCommits;
  const disabled = !project.enabled ? ' [disabled]' : '';
  const schedule = describeCronSchedule(project.cronSchedule || null);

  return `${status} ${name}(${project.path}) [max: ${maxCommits}] [schedule: ${schedule}]${disabled}`;
}

/**
 * List all projects
 */
export async function listProjects() {
  const config = await loadConfig();

  if (config.projects.length === 0) {
    console.log(
      'No projects configured. Add one with: bragdoc projects add <path>',
    );
    return;
  }

  console.log('Configured projects:');
  config.projects.forEach((project) => {
    console.log(formatProject(project, config.settings.defaultMaxCommits));
  });
}

/**
 * Add a new project
 */
export async function addProject(
  path: string = process.cwd(),
  options: { name?: string; maxCommits?: number } = {},
) {
  const config = await loadConfig();
  const absolutePath = normalizeRepoPath(path);

  // Validate repository
  await validateRepository(absolutePath);

  // Check for duplicates
  const existingProject = config.projects.find((p) => p.path === absolutePath);
  if (existingProject) {
    // If project exists and doesn't have an id, try to sync it
    if (!existingProject.id) {
      console.log(
        chalk.yellow('Project already exists. Syncing with web app...'),
      );
      const repoInfo = getRepositoryInfo(absolutePath);
      const repoName =
        existingProject.name || getRepositoryName(repoInfo.remoteUrl);
      const projectId = await syncProjectWithApi(absolutePath, repoName);

      if (projectId) {
        existingProject.id = projectId;
        existingProject.remote = repoInfo.remoteUrl;
        await saveConfig(config);
        console.log(chalk.green('✓ Repository synced with web app'));
      }
    } else {
      console.log(
        chalk.yellow('Project already exists and is synced with web app.'),
      );
    }
    return;
  }

  // Get repository info for name and remote URL
  const repoInfo = getRepositoryInfo(absolutePath);
  const repoName = options.name || getRepositoryName(repoInfo.remoteUrl);

  // Sync with API to get or create project
  const projectId = await syncProjectWithApi(absolutePath, repoName);

  // Always prompt for cron schedule
  const cronSchedule = await promptForCronSchedule();

  // Add project
  const newProject: Project = {
    path: absolutePath,
    name: options.name,
    enabled: true,
    maxCommits: options.maxCommits
      ? Number.parseInt(options.maxCommits.toString(), 10)
      : undefined,
    cronSchedule: cronSchedule || undefined,
    id: projectId,
    remote: repoInfo.remoteUrl,
  };

  config.projects.push(newProject);
  await saveConfig(config);

  console.log(
    chalk.green(
      `✓ Added project: ${formatProject(
        newProject,
        config.settings.defaultMaxCommits,
      )}`,
    ),
  );

  // If this repo has a schedule, ensure system-level scheduling is set up
  if (cronSchedule) {
    await ensureSystemScheduling();
  }
}

/**
 * Remove a project
 */
export async function removeProject(path: string = process.cwd()) {
  const config = await loadConfig();
  const absolutePath = normalizeRepoPath(path);

  const index = config.projects.findIndex((p) => p.path === absolutePath);
  if (index === -1) {
    throw new Error('Project not found in configuration');
  }

  const hadSchedule = config.projects[index].cronSchedule;
  config.projects.splice(index, 1);
  await saveConfig(config);

  console.log(`Removed project: ${absolutePath}`);

  // If the removed repo had a schedule, update system scheduling
  if (hadSchedule) {
    console.log(chalk.blue('🔧 Updating system scheduling...'));
    try {
      if (process.platform === 'win32') {
        await installWindowsScheduling();
      } else {
        await installSystemCrontab();
      }
    } catch (error: any) {
      console.error(
        chalk.red('Failed to update system scheduling:'),
        error.message,
      );
    }
  }
}

/**
 * Update project settings
 */
export async function updateProject(
  path: string = process.cwd(),
  options: { name?: string; maxCommits?: number; schedule?: boolean } = {},
) {
  const config = await loadConfig();
  const absolutePath = normalizeRepoPath(path);

  const project = config.projects.find((p) => p.path === absolutePath);
  if (!project) {
    throw new Error('Project not found in configuration');
  }

  if (options.name !== undefined) {
    project.name = options.name;
  }

  if (options.maxCommits !== undefined) {
    project.maxCommits = Number.parseInt(options.maxCommits.toString(), 10);
  }

  if (options.schedule) {
    const cronSchedule = await promptForCronSchedule();
    project.cronSchedule = cronSchedule || undefined;
  }

  await saveConfig(config);
  console.log(
    `Updated project: ${formatProject(project, config.settings.defaultMaxCommits)}`,
  );

  // If schedule was updated, automatically update system scheduling
  if (options.schedule) {
    console.log(chalk.blue('🔧 Updating system scheduling...'));

    try {
      if (process.platform === 'win32') {
        await installWindowsScheduling();
      } else {
        await installSystemCrontab();
      }
    } catch (error: any) {
      console.error(
        chalk.red('Failed to update system scheduling:'),
        error.message,
      );
      console.log(
        chalk.blue('💡 You can manually run the install command if needed.'),
      );
    }
  }
}

/**
 * Enable or disable a project
 */
export async function toggleProject(path: string, enabled: boolean) {
  const config = await loadConfig();
  const absolutePath = normalizeRepoPath(path);

  const project = config.projects.find((p) => p.path === absolutePath);
  if (!project) {
    throw new Error('Project not found in configuration');
  }

  project.enabled = enabled;
  await saveConfig(config);

  console.log(
    `${enabled ? 'Enabled' : 'Disabled'} project: ${formatProject(
      project,
      config.settings.defaultMaxCommits,
    )}`,
  );
}

/**
 * Create an alias 'init' command that points to 'projects add'
 */
export const initCommand = new Command('init')
  .description('Initialize a project for bragdoc (alias for projects add)')
  .argument('[path]', 'Path to repository (defaults to current directory)')
  .option('-n, --name <name>', 'Friendly name for the repository')
  .option('-m, --max-commits <number>', 'Maximum number of commits to extract')
  .action(addProject);
