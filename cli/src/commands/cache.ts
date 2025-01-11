import { Command } from 'commander';
import { CommitCache } from '../cache/commits';
import { getCurrentRepoName } from '../git/operations';

const cache = new CommitCache();

export const cacheCommand = new Command('cache')
  .description('Manage commit cache')
  .addCommand(
    new Command('list')
      .description('List cached commits')
      .option('--repo <name>', 'Repository name (defaults to current repository)')
      .option('--stats', 'Show only statistics')
      .action(async (options) => {
        try {
          const repoName = options.repo || await getCurrentRepoName();
          
          if (options.stats) {
            const stats = await cache.getStats(repoName);
            console.log('Cache Statistics:');
            console.log(`Repositories: ${stats.repositories}`);
            console.log(`Total Commits: ${stats.commits}`);
            if (stats.repoStats) {
              console.log('\nPer Repository:');
              Object.entries(stats.repoStats).forEach(([repo, count]) => {
                console.log(`${repo}: ${count} commits`);
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
          commits.forEach(hash => console.log(hash));
          console.log(`\nTotal: ${commits.length} commits`);
        } catch (error: any) {
          console.error('Failed to list cache:', error?.message || 'Unknown error');
          process.exit(1);
        }
      }),
  )
  .addCommand(
    new Command('clear')
      .description('Clear commit cache')
      .option('--repo <name>', 'Repository name (defaults to current repository)')
      .option('--all', 'Clear cache for all repositories')
      .action(async (options) => {
        try {
          if (options.all) {
            await cache.clear();
            console.log('Cleared cache for all repositories');
            return;
          }

          const repoName = options.repo || await getCurrentRepoName();
          await cache.clear(repoName);
          console.log(`Cleared cache for repository: ${repoName}`);
        } catch (error: any) {
          console.error('Failed to clear cache:', error?.message || 'Unknown error');
          process.exit(1);
        }
      }),
  );
