# bragdoc CLI

**Automatically track, score, and summarize your professional achievements from Git commits.**

The bragdoc CLI intelligently analyzes your Git repositories to extract and document your professional contributions. It automatically identifies meaningful work from commit messages, code changes, and project history, then scores and summarizes your achievements to build a comprehensive professional brag document.

## ✨ **Key Features**

- **🤖 Intelligent Achievement Extraction**: Automatically identifies and scores meaningful work from Git commits
- **📅 Scheduled Automation**: Set up automatic extractions on any schedule (hourly, daily, custom)
- **🔍 Multi-Repository Support**: Track achievements across unlimited repositories simultaneously
- **⚡ Smart Caching**: Processes only new commits, avoiding duplicate work
- **🌍 Cross-Platform Scheduling**: Native system integration (cron, Task Scheduler, systemd, LaunchAgent)
- **📊 Achievement Scoring**: AI-powered analysis ranks the impact and importance of your work
- **📝 Professional Summaries**: Generates polished descriptions of your contributions

Perfect for developers who want to maintain an up-to-date record of their professional accomplishments without manual effort.

## Installation

```bash
npm install -g @bragdoc/cli
```

## Quick Start

1. Authenticate with bragdoc:

```bash
bragdoc login
```

2. Initialize your repository:

```bash
bragdoc init
```

3. Extract achievements from commits:

```bash
bragdoc extract
```

## Commands

### Authentication (`auth`)

Manage your bragdoc authentication.

```bash
# Login to bragdoc
bragdoc auth login # aliased as `login`

# Check authentication status
bragdoc auth status

# Logout from bragdoc
bragdoc auth logout # aliased as `logout`
```

### Repository Management

Initialize and manage repositories that bragdoc will track.

```bash
# Initialize a repository (syncs with web app if authenticated)
cd /path/to/repo
bragdoc init
# You'll be prompted to:
# 1. Choose extraction schedule (no/hourly/daily/custom)
# 2. Automatic system installation (crontab/Task Scheduler)

# Or use the repos command (init is an alias for repos add)
bragdoc repos add [path]

# List configured repositories (shows schedules)
bragdoc repos list

# Update repository settings
bragdoc repos update [path] --name "New Name" --max-commits 200

# Update repository schedule (automatically updates system scheduling)
bragdoc repos update [path] --schedule

# Remove a repository
bragdoc repos remove [path]

# Enable/disable repository tracking
bragdoc repos enable [path]
bragdoc repos disable [path]
```

### Achievement Extraction (`extract`)

Extract achievements from Git commits.

```bash
# Extract from current repository
bragdoc extract

# Extract from specific branch
bragdoc extract --branch main

# Limit number of commits
bragdoc extract --max-commits 50

# Dry run to preview what would be extracted
bragdoc extract --dry-run
```

### Monitoring Your Schedules

Check your automatic extractions using platform-specific tools:

**Linux/macOS**

```bash
# View your scheduled extractions
crontab -l

# Check cron service is running
ps aux | grep cron
```

**Windows**

```bash
# View your scheduled tasks
schtasks /query /tn BragDoc*

# Open Task Scheduler GUI for visual management
taskschd.msc
```

### Cache Management (`cache`)

Manage the local commit cache to optimize performance.

```bash
# List cached commits
bragdoc cache list
bragdoc cache list --stats

# Clear cache
bragdoc cache clear              # Clear current repo's cache
bragdoc cache clear --all        # Clear all cached data
bragdoc cache clear --repo name  # Clear specific repo's cache
```

### Data Management (`data`)

Manage the local cache of companies, projects, and standups data. The CLI automatically caches this data to reduce API calls and improve performance.

```bash
# Fetch all data from API (force refresh)
bragdoc data fetch

# Clear all cached data
bragdoc data clear
```

**Cache Timeout**: By default, cached data is refreshed every 5 minutes. You can configure this in your config file using the `dataCacheTimeout` setting (in minutes).

The data cache is stored in `~/.bragdoc/cache/` and includes:

- `companies.yml` - Your companies
- `projects.yml` - Your projects
- `standups.yml` - Your standups
- `meta.yml` - Cache metadata and timestamps

## Configuration

The CLI stores configuration in `~/.bragdoc/config.yml`:

- Authentication tokens
- Repository settings and schedules
- Commit cache locations
- API configuration

## Automated Workflow Example

Here's how to set up fully automated achievement tracking:

```bash
# 1. Install and authenticate
npm install -g @bragdoc/cli
bragdoc login

# 2. Initialize your repositories with scheduling
cd ~/work/frontend-app
bragdoc init --name "Frontend App"
# Choose "Daily" → Enter "18:00" → Automatically installs to crontab

cd ~/work/backend-api
bragdoc init --name "Backend API"
# Choose "Hourly" → Enter "0" → Automatically updates crontab

cd ~/work/mobile-app
bragdoc init --name "Mobile App"
# Choose "Daily" → Enter "09:00" → Automatically updates crontab

# 3. Your achievements are now automatically extracted:
# - Frontend App: Daily at 6:00 PM
# - Backend API: Every hour on the hour
# - Mobile App: Daily at 9:00 AM
```

## Best Practices

1. **Automatic Scheduling**:

   - Set daily extractions for active repositories
   - Use hourly for rapidly evolving projects
   - Schedule during off-hours to avoid interruption

2. **Repository Organization**:

   - Add repositories you actively contribute to
   - Use meaningful repository names
   - Set appropriate max-commit limits (100-500)

3. **Schedule Management**:

   - Use system-level scheduling for reliability
   - Check system logs if extractions fail
   - Re-run installation commands to update schedules

4. **Cache Management**:
   - The cache prevents re-processing of commits
   - Clear cache if you need to re-process commits
   - Use `cache list --stats` to monitor cache size

## Error Handling

The CLI provides detailed error messages and logging:

- Authentication errors
- Repository validation issues
- API communication problems
- Cache-related errors

## Environment Variables

- `BRAGDOC_API_URL`: Override the API endpoint
- `BRAGDOC_DEBUG`: Enable debug logging

## Troubleshooting

1. **Authentication Issues**

   - Ensure you're logged in: `bragdoc auth status`
   - Try logging out and back in
   - Check your internet connection

2. **Repository Issues**

   - Verify repository path exists
   - Ensure repository has a remote URL
   - Check repository permissions

3. **Extraction Issues**

   - Verify repository is enabled: `bragdoc repos list`
   - Check max-commits setting
   - Try clearing the cache

4. **Scheduling Issues**

   - **Linux/macOS**: Check crontab with `crontab -l`
   - **Windows**: Check tasks with `schtasks /query /tn BragDoc*`
   - Verify system scheduling permissions
   - Check extraction logs in system scheduler
   - Check that system scheduling was properly set up automatically

5. **System Integration Issues**
   - **Windows**: Run Command Prompt as Administrator for task creation
   - **macOS**: Check LaunchAgent with `launchctl list | grep bragdoc`
   - **Linux**: Verify systemd user services are enabled

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.
