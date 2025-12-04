import { Command } from 'commander';
import { CommitCache } from '../cache/commits';
import { getCurrentRepoName } from '../git/operations';

const cache = new CommitCache();

export const cacheCommand = new Command('cache')
  .description('Manage commit cache')
  .addCommand(
    new Command('list')
      .description('List cached commits')
      .option('--project <name>', 'Project name (defaults to current project)')
      .option('--stats', 'Show only statistics')
      .action(async (options) => {
        try {
          const repoName = options.project || (await getCurrentRepoName());

          if (options.stats) {
            const stats = await cache.getStats(repoName);
            console.log('Cache Statistics:');
            console.log(`Sources: ${stats.sources}`);
            console.log(`Total Commits: ${stats.commits}`);
            if (stats.sourceStats) {
              console.log('\nPer Source:');
              Object.entries(stats.sourceStats).forEach(([source, count]) => {
                console.log(`${source}: ${count} commits`);
              });
            }
            return;
          }

          const commits = await cache.list(repoName);
          if (commits.length === 0) {
            console.log(`No cached commits found for repository: ${repoName}`);
            return;
          }

          console.log(`Cached commits for ${repoName}:`);
          for (const hash of commits) {
            console.log(hash);
          }
          console.log(`\nTotal: ${commits.length} commits`);
        } catch (error: any) {
          console.error(
            'Failed to list cache:',
            error?.message || 'Unknown error',
          );
          process.exit(1);
        }
      }),
  )
  .addCommand(
    new Command('clear')
      .description('Clear commit cache')
      .option('--project <name>', 'Project name (defaults to current project)')
      .option('--all', 'Clear cache for all projects')
      .action(async (options) => {
        try {
          if (options.all) {
            await cache.clear();
            console.log('Cleared cache for all projects');
            return;
          }

          const repoName = options.project || (await getCurrentRepoName());
          await cache.clear(repoName);
          console.log(`Cleared cache for project: ${repoName}`);
        } catch (error: any) {
          console.error(
            'Failed to clear cache:',
            error?.message || 'Unknown error',
          );
          process.exit(1);
        }
      }),
  );
