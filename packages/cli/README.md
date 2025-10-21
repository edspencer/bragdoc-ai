# bragdoc CLI

**Automatically track, score, and summarize your professional achievements from Git commits.**

The bragdoc CLI intelligently analyzes your Git repositories to extract and document your professional contributions. It automatically identifies meaningful work from commit messages, code changes, and project history, then scores and summarizes your achievements to build a comprehensive professional brag document.

## ✨ **Key Features**

- **🤖 Intelligent Achievement Extraction**: Automatically identifies and scores meaningful work from Git commits
- **🔌 Multi-Provider LLM Support**: Choose from OpenAI, Anthropic, Google, DeepSeek, Ollama, or any OpenAI-compatible API
- **📅 Scheduled Automation**: Set up automatic extractions on any schedule (hourly, daily, custom)
- **🔍 Multi-Project Support**: Track achievements across unlimited projects simultaneously
- **⚡ Smart Caching**: Processes only new commits, avoiding duplicate work
- **🌍 Cross-Platform Scheduling**: Native system integration (cron, Task Scheduler, systemd, LaunchAgent)
- **📊 Achievement Scoring**: AI-powered analysis ranks the impact and importance of your work
- **📝 Professional Summaries**: Generates polished descriptions of your contributions
- **🔒 Privacy Options**: Run locally with Ollama - no data leaves your machine

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

2. Initialize your project:

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

### Project Management

Initialize and manage projects that bragdoc will track.

```bash
# Initialize a project (syncs with web app if authenticated)
cd /path/to/repo
bragdoc init
# You'll be prompted to:
# 1. Choose extraction schedule (no/hourly/daily/custom)
# 2. Automatic system installation (crontab/Task Scheduler)

# Or use the projects command (init is an alias for projects add)
bragdoc projects add [path]

# List configured projects (shows schedules)
bragdoc projects list

# Update project settings
bragdoc projects update [path] --name "New Name" --max-commits 200

# Update project schedule (automatically updates system scheduling)
bragdoc projects update [path] --schedule

# Remove a project
bragdoc projects remove [path]

# Enable/disable project tracking
bragdoc projects enable [path]
bragdoc projects disable [path]
```

### Achievement Extraction (`extract`)

Extract achievements from Git commits.

```bash
# Extract from current project
bragdoc extract

# Extract from specific branch
bragdoc extract --branch main

# Limit number of commits
bragdoc extract --max-commits 50

# Dry run to preview what would be extracted
bragdoc extract --dry-run
```

### WIP Extraction (`wip`)

Extract uncommitted work-in-progress from your current project. This command analyzes git status and diffs to generate a summary of changes, but does not upload to the API.

```bash
# Extract WIP from current directory
bragdoc wip

# Extract with verbose logging
bragdoc wip --log
```

**Note**: This command is useful for testing WIP extraction locally. For automated standup WIP extraction, use `bragdoc standup wip`.

### Standup WIP Automation (`standup`)

Automatically extract achievements and work-in-progress summaries before your daily standup meetings. The CLI can extract from multiple projects and submit to your standup in one command.

#### Setup

First, create a standup in the web app at https://app.bragdoc.ai/standups (takes <30 seconds). Then enroll your projects:

```bash
# From within a project directory - enroll single project
cd /path/to/project
bragdoc standup enable

# From anywhere - enroll multiple projects
bragdoc standup enable
# You'll see a checkbox list to select multiple projects
```

When you enable a standup, the CLI will:
1. Fetch your standups from the web app
2. Let you select which standup to configure
3. Automatically set up system scheduling (cron/Task Scheduler)
4. Extract achievements and WIP 10 minutes before your standup time

#### Commands

```bash
# Enable standup WIP extraction
bragdoc standup enable

# Check standup configuration
bragdoc standup status

# Manually extract and submit WIP for all enrolled projects
bragdoc standup wip

# Manually extract for specific standup (if you have multiple)
bragdoc standup wip --id <standupId>

# Disable standup for current project
cd /path/to/project
bragdoc standup disable
```

#### How It Works

**Automatic Mode** (Scheduled):
- 10 minutes before your standup time, the CLI automatically:
  1. Extracts new achievements from git commits (all enrolled projects)
  2. Extracts work-in-progress summaries from uncommitted changes (all enrolled projects)
  3. Submits combined WIP to your standup in the web app

**Manual Mode**:
- Run `bragdoc standup wip` anytime to extract and submit immediately
- Useful for testing or ad-hoc updates

**Multi-Project Support**:
- Enroll multiple projects in a single standup
- WIP extraction runs concurrently across all projects
- Combined summary includes all projects with clear headers

#### Example Workflow

```bash
# 1. Set up your first project
cd ~/work/frontend-app
bragdoc init --name "Frontend App"
bragdoc standup enable
# Select your standup from the list

# 2. Add more projects to the same standup
cd ~/work/backend-api
bragdoc init --name "Backend API"
bragdoc standup enable
# Select the same standup

# 3. Check configuration
bragdoc standup status
# Shows:
# - Standup name and schedule
# - Number of enrolled projects
# - List of project names

# 4. Test manual extraction
bragdoc standup wip
# Extracts from both projects and submits to web app
```

### LLM Configuration (`llm`)

Manage your LLM provider configuration for achievement extraction.

```bash
# Show current LLM configuration
bragdoc llm show

# Configure or reconfigure LLM provider
bragdoc llm set
```

The `llm set` command provides an interactive wizard that guides you through:
- Selecting your LLM provider (OpenAI, Anthropic, Google, DeepSeek, Ollama, OpenAI-compatible)
- Entering your API key (if required)
- Choosing your model (with sensible defaults)
- Configuring base URL (for Ollama and OpenAI-compatible providers)

**When to use:**
- After initial installation to set up your preferred LLM provider
- To switch between providers (e.g., from cloud to local Ollama)
- To update API keys or model versions
- To check which provider is currently configured

**Note:** You don't need to run this command manually if you're going through the normal flow - `bragdoc init`, `bragdoc extract`, and other commands will prompt you to configure the LLM provider if needed.

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
bragdoc cache clear              # Clear current project's cache
bragdoc cache clear --all        # Clear all cached data
bragdoc cache clear --project name  # Clear specific project's cache
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

## Extraction Detail Levels

BragDoc CLI supports configurable extraction detail levels to control how much data is collected from git commits. More detailed extraction provides the LLM with richer context for better achievement extraction, but uses more LLM tokens and takes longer to process.

### Detail Levels

- **minimal**: Commit messages only (fastest, least context)
- **standard**: Messages + file statistics (recommended default)
- **detailed**: Messages + stats + limited code diffs
- **comprehensive**: Messages + stats + extensive code diffs (slowest, most context)

### CLI Options

```bash
# Use a preset detail level
bragdoc extract --detail-level detailed

# Fine-grained control
bragdoc extract --include-stats           # Add file statistics only
bragdoc extract --include-stats --include-diff  # Add both stats and diffs
```

### Configuration File

Set defaults in `~/.bragdoc/config.yml`:

```yaml
# Global default for all projects
settings:
  defaultExtraction:
    detailLevel: standard

# Project-specific configuration
projects:
  - path: /home/user/my-project
    extraction:
      detailLevel: detailed
      # Or fine-grained control:
      includeStats: true
      includeDiff: true
      maxDiffLinesPerCommit: 800
      excludeDiffPatterns:
        - "*.lock"
        - "dist/**"
```

### Performance Considerations

- **minimal**: Fastest, best for large commit batches
- **standard**: Good balance of speed and context (recommended)
- **detailed**: Slower, use for smaller batches or important projects
- **comprehensive**: Slowest, only for critical extractions or small batches

Diff extraction adds significant LLM context. Consider reducing `--batch-size` when using `detailed` or `comprehensive` levels.

## Configuration

The CLI stores configuration in `~/.bragdoc/config.yml`:

- Authentication tokens
- Project settings and schedules
- LLM provider configuration
- Commit cache locations
- API configuration

### LLM Provider Configuration

The CLI uses AI to analyze your commits and extract achievements. It supports multiple LLM providers, giving you flexibility to choose based on cost, performance, or privacy requirements.

#### Supported Providers

The CLI supports the following LLM providers:

1. **OpenAI** (GPT-4, GPT-4o)
   - Requires: API key from https://platform.openai.com/api-keys
   - Default model: `gpt-4o`

2. **Anthropic** (Claude)
   - Requires: API key from https://console.anthropic.com/settings/keys
   - Default model: `claude-3-5-sonnet-20241022`

3. **Google** (Gemini)
   - Requires: API key from https://aistudio.google.com/app/apikey
   - Default model: `gemini-1.5-pro`

4. **DeepSeek**
   - Requires: API key from https://platform.deepseek.com/api_keys
   - Default model: `deepseek-chat`

5. **Ollama** (Local LLMs)
   - Requires: Ollama installed locally (https://ollama.com)
   - Models: `llama3.2`, `qwen2.5-coder`, etc.
   - No API key needed - runs entirely on your machine

6. **OpenAI-Compatible** (LM Studio, LocalAI, etc.)
   - Requires: Base URL and model name
   - Example: LM Studio at `http://localhost:1234/v1`
   - Optional API key depending on your setup

#### How Configuration Works

You can configure your LLM provider in two ways:

**1. Interactive Setup (Recommended)**

Run `bragdoc llm set` to launch an interactive wizard that guides you through provider selection and configuration.

The CLI will also automatically prompt you to configure an LLM provider when you:
- Run `bragdoc init` to add a new project
- Run `bragdoc extract` without an LLM configured
- Run `bragdoc projects update --schedule` to set up automatic extraction
- Run `bragdoc standup enable` to enable standup WIP extraction

You'll be guided through an interactive setup that asks for:
- Which provider you want to use
- API key (if required)
- Model name (with sensible defaults)
- Base URL (for Ollama and OpenAI-compatible providers)

The configuration is saved to `~/.bragdoc/config.yml` with secure file permissions (0600).

**2. Manual Configuration**

You can manually edit `~/.bragdoc/config.yml` to configure your LLM provider. Here are examples for each provider:

**OpenAI:**
```yaml
llm:
  provider: openai
  openai:
    apiKey: sk-your-api-key-here
    model: gpt-4o
    baseURL: https://api.openai.com/v1  # optional
```

**Anthropic:**
```yaml
llm:
  provider: anthropic
  anthropic:
    apiKey: sk-ant-your-api-key-here
    model: claude-3-5-sonnet-20241022
```

**Google:**
```yaml
llm:
  provider: google
  google:
    apiKey: your-google-api-key-here
    model: gemini-1.5-pro
```

**DeepSeek:**
```yaml
llm:
  provider: deepseek
  deepseek:
    apiKey: your-deepseek-api-key-here
    model: deepseek-chat
    baseURL: https://api.deepseek.com/v1  # optional
```

**Ollama:**
```yaml
llm:
  provider: ollama
  ollama:
    model: llama3.2
    baseURL: http://localhost:11434/api  # optional, defaults to this
```

**OpenAI-Compatible:**
```yaml
llm:
  provider: openai-compatible
  openaiCompatible:
    baseURL: http://localhost:1234/v1
    model: your-model-name
    apiKey: optional-api-key  # only if your server requires it
```

## Automated Workflow Example

Here's how to set up fully automated achievement tracking:

```bash
# 1. Install and authenticate
npm install -g @bragdoc/cli
bragdoc login

# 2. Initialize your projects with scheduling
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

   - Set daily extractions for active projects
   - Use hourly for rapidly evolving projects
   - Schedule during off-hours to avoid interruption

2. **Project Organization**:

   - Add projects you actively contribute to
   - Use meaningful project names
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
- Project validation issues
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

2. **Project Issues**

   - Verify project path exists
   - Ensure project has a remote URL
   - Check project permissions

3. **Extraction Issues**

   - Verify project is enabled: `bragdoc projects list`
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

6. **LLM Configuration Issues**

   - **"LLM provider is not configured" error**:
     - Run `bragdoc llm set` to configure your LLM provider
     - Or run `bragdoc init` to trigger the interactive LLM setup
     - Or manually edit `~/.bragdoc/config.yml` to add your LLM configuration
     - Verify your API key is correct and has sufficient credits/quota

   - **Ollama "Not Found" (404) errors**:
     - Ensure Ollama is running: `ollama serve`
     - Verify the baseURL includes `/api`: `http://localhost:11434/api`
     - Check that the model is pulled: `ollama pull llama3.2`

   - **Scheduled extractions not using configured LLM**:
     - Ensure LLM config is properly set in `~/.bragdoc/config.yml`
     - Run `bragdoc extract` manually first to verify LLM configuration works

   - **API rate limiting or quota errors**:
     - Check your API provider's dashboard for usage limits
     - Consider switching to a different provider or local Ollama
     - Reduce extraction frequency in your schedule

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.
