# Marketing Site V2 Spec

The bragdoc marketing site is a static site (apps/marketing) that is separate and standalone from the bragdoc app (which lives in apps/web).

The main app will be found at https://app.bragdoc.ai, whereas this marketing site will live at www.bragdoc.ai.

## Objectives

- Educate people about the value of a "brag document"
- Funnel users into either the free or paid versions of bragdoc proper

## Guidance

We're looking to provide genuinely valuable product to users, and to market the product ethically and with the customer's best interests in mind.

- No fake testimonials - we don't have any yet so don't try to add that
- No fake stats - we don't have any yet so don't try to add that
- No company logos - we're a brand that is used by individuals
- Use the @agent-web-app-tester or Playwright MCP tools to visually analyze inspiration sites
- Use the @agent-web-app-tester to take screenshots of the various features of the app

## Visual design

The marketing site should have a modern, clean, and professional look and feel. It should be easy to navigate and understand.

### Theme Requirements

The marketing site **must** support both light and dark modes:

- **Implementation**: Use `next-themes` package for theme management
- **Default behavior**: System default (respects user's OS preference)
- **User control**: Visible theme toggle to switch between light/dark modes
- **Persistence**: User's theme preference should be saved (localStorage)
- **Consistency**: All components, images, and UI elements must work well in both themes
- **Accessibility**: Ensure sufficient contrast in both modes
- **Smooth transitions**: Theme switching should be smooth and instantaneous

The theme toggle should be prominently accessible, likely in the header/navigation area.

### Inspiration sites

- https://www.mintlify.com/ - has a really nice look and feel. I like the idea of the Email + Start Now button (though it seems to clash with google/github... we don't actually allow email signups)

- https://www.notion.com/ - nice design, UI-screenshot heavy

### Screenshots

The marketing site should include screenshots of the various features of the app. Once we've got a solid set of features, use the @agent-web-app-tester to take screenshots of the various features of the app. Just like in those inspiration site examples, we want to have lots of high quality screenshots (with captions as necessary).

## Background information

BragDoc is a comprehensive achievement tracking system consisting of two complementary parts:

1. **Web Application** (app.bragdoc.ai) - A modern web interface for managing achievements, projects, companies, and generating AI-powered documents
2. **Command Line Interface** (CLI) - A powerful terminal tool that extracts achievements from your local git repositories and automates standup preparation

Together, these tools help knowledge workers automatically track their impact at work. The CLI extracts achievements from commits in git repositories, assessing the impact of each one and summarizing what was done. The web app provides a polished interface for reviewing, organizing, and presenting those achievements as professional documents such as weekly or monthly reports for managers.

BragDoc works silently and efficiently in the background: after a simple `npm install -g @bragdoc/cli` and quick setup, it can be configured to automatically track achievements on a schedule and prepare standup notes before your daily meetings.

"Brag documents" are a well known and tongue-in-cheek way of referring to documents that are used to document one's achievements.

### The BragDoc CLI: Your Achievement Extraction Engine

The BragDoc CLI is a Node.js command-line tool that runs on your local machine and integrates deeply with your development workflow. It serves as the bridge between your actual work (git commits) and your achievement tracking.

**How It Works (Privacy-First Design):**

The CLI uses a privacy-first architecture designed to keep your code completely private:

1. **Runs Entirely Locally**: The CLI executes standard `git log` commands on your machine to retrieve commit metadata (commit messages, dates, authors, etc.)
2. **Filters by Your Identity**: Only processes commits attributed to your configured git username/email
3. **Sends Only Git Metadata**: Your actual source code never leaves your machine - only commit messages and metadata are analyzed
4. **Your LLM, Your Choice**: Sends git metadata to the LLM provider YOU configure (OpenAI, Anthropic, local Ollama, etc.)
5. **AI Extracts Achievements**: The LLM analyzes commit messages and extracts achievements based on custom prompts
6. **Sends Only Achievements**: Only the final, extracted achievements are sent to the BragDoc web app

**Complete Privacy Control:**
- ✅ **Your code stays on your machine** - We never see it
- ✅ **You choose the LLM** - Use cloud providers or completely local Ollama
- ✅ **You control the data flow** - Point CLI at local BragDoc instance if desired
- ✅ **100% Offline Option**: Local BragDoc app + Local Ollama LLM = Zero cloud dependencies
- ✅ **Transparent process** - Open source, you can audit exactly what's sent

**Cost Transparency:**
- Using cloud LLM providers (OpenAI, Anthropic, Google) incurs **small costs** that you pay directly to them
- Costs are typically pennies per extraction (e.g., $0.01-0.05 for 100 commits)
- Using **Ollama is completely free** - runs locally on your machine
- BragDoc hosted service ($4.99/month) is intentionally cheap - we want it to be a career-long tool
- Or self-host everything for free if you prefer

**Core Capabilities:**
- **Automatic Git Analysis**: Scans your git commits and uses AI to identify meaningful achievements
- **Standup Automation**: Automatically extracts work-in-progress and recent achievements 10 minutes before your standup time
- **Multi-Repository Support**: Track achievements across all your projects from a single CLI
- **Smart Scheduling**: Set up automatic extractions via cron (Unix/Mac) or Task Scheduler (Windows)
- **Local LLM Configuration**: Use OpenAI, Anthropic, Google, DeepSeek, Ollama, or any OpenAI-compatible provider
- **Offline-First Design**: Works with private repositories that may not be accessible via cloud APIs
- **Intelligent Caching**: Never reprocesses the same commits twice

**Primary CLI Commands:**
- `bragdoc init` - Initialize a project for automatic tracking
- `bragdoc extract` - Extract achievements from git commits now
- `bragdoc standup enable` - Set up automatic standup preparation
- `bragdoc wip` - See your current work-in-progress
- `bragdoc login` - Authenticate with the web app

The CLI is designed to be completely hands-off once configured. Set it up once, and it runs in the background, quietly building your achievement history as you work.

### Features

BragDoc offers a comprehensive suite of features designed to help knowledge workers automatically track, organize, and communicate their professional impact.

#### Core Achievement Tracking

**Automatic Git Extraction (via CLI)**
- The BragDoc CLI automatically extracts achievements from git commits across all your repositories
- AI-powered analysis of commit messages and code changes to identify meaningful work
- Runs locally on your machine - works with private repos, on-premise code, and any git repository
- Intelligent deduplication: uses local cache to avoid reprocessing the same commits
- Batch processing for efficient handling of large commit histories (configurable batch sizes)
- Scheduled automatic extraction: set it to run daily, hourly, or on your own custom schedule
- Manual extraction on demand: `bragdoc extract` whenever you want to update
- GitHub integration in web app for cloud-hosted repositories

**Manual Achievement Entry**
- Quick-add interface for achievements that don't come from commits
- Rich metadata support: dates, duration, impact level, descriptions
- Inline impact rating with intuitive 1-10 star system
- Link achievements to specific projects and companies
- Easy editing and updating of existing achievements
- Drag-and-drop reordering and organization

**Smart Achievement Management**
- Advanced search and filtering across all your achievements
- Sort by date, impact, project, company, or custom criteria
- Visual organization with color-coded projects
- Interactive achievement list with inline editing
- Full CRUD operations (Create, Read, Update, Delete)
- Activity feed showing recent changes and updates

**Impact Tracking & Analytics**
- Automatic impact assessment for each achievement
- Impact points system with trend visualization
- Dashboard showing total impact over time
- Visual charts displaying achievement metrics
- Progress tracking across projects and time periods

#### Project & Company Organization

**Project Management**
- Create and manage unlimited projects
- Link projects to specific companies/employers
- GitHub repository integration for automatic syncing
- Track project timelines with start and end dates
- Set project status (active, completed, archived)
- Color-code projects for visual organization
- Associate achievements with projects for better organization
- View all achievements for a specific project
- Project-specific analytics and impact tracking

**Company Management**
- Maintain a record of all companies you've worked with
- Track employment periods and roles
- Link projects to specific companies
- Filter achievements and documents by company
- Support for multiple concurrent companies (freelance, consulting)
- Company-specific achievement summaries
- Full CRUD operations for company management

#### AI-Powered Document Generation

**Manager Reports ("For My Manager")**
- Generate weekly or monthly reports for your immediate manager
- AI analyzes your achievements and generates polished documents
- Automatically organizes content by project, impact, or timeline
- Includes relevant metrics and impact statements
- Customizable time ranges for report periods
- Professional formatting ready to share

**Document Management**
- Edit and refine AI-generated content
- Save and manage multiple documents
- View document history and previous reports
- Print-friendly formatting for review meetings
- Company-specific document filtering
- Easy document navigation and organization

#### Standup Mode (CLI + Web Integration)

**Automated Standup Preparation**
- Configure standup times in the web app (e.g., "Daily at 9:45 AM PST")
- CLI automatically runs 10 minutes before your standup time
- Extracts work-in-progress from all enrolled projects
- Pulls in recent achievements from the last 24-48 hours
- Combines everything into a formatted standup summary
- Sends prepared standup notes to the web app for quick review
- Never be caught off-guard in standup again

**CLI Standup Commands**
- `bragdoc standup enable` - Enroll projects in a standup (sets up automatic scheduling)
- `bragdoc standup wip` - Manually extract WIP right now
- `bragdoc standup status` - See which projects are enrolled and when extractions run
- `bragdoc standup disable` - Unenroll from a standup
- Works on Unix/Mac (cron) and Windows (Task Scheduler)

**Work-in-Progress Extraction**
- `bragdoc wip` shows uncommitted changes across your codebase
- Summarizes what you're currently working on
- Perfect for async standups or status updates
- Gives you a quick snapshot of your active work
- No more "what am I working on?" moments

**Multi-Project Standup Support**
- Enroll multiple repositories in the same standup
- CLI aggregates WIP and achievements from all enrolled projects
- One unified standup summary across all your work
- Handles concurrent work on multiple codebases elegantly

#### Data Management & Portability

**Export & Import**
- Export all your data in JSON format
- Complete data portability - your data stays yours
- Import data from previous exports
- Backup your achievement history anytime
- No vendor lock-in - take your data with you
- Easy migration between instances (cloud to self-hosted)

#### Command Line Interface (CLI)

The BragDoc CLI is a powerful, production-ready terminal application that integrates your actual work with your achievement tracking system. It's designed to run silently in the background while giving you complete control when you need it.

**Installation & Setup**
```bash
# Install globally
npm install -g @bragdoc/cli

# Authenticate with web app (opens browser)
bragdoc login

# Initialize your first project
cd ~/projects/my-app
bragdoc init
```

**Authentication & Security**
- Secure browser-based OAuth flow (opens browser, receives token)
- Long-lived revocable tokens (30 days)
- Token stored securely in `~/.bragdoc/config.yml` (file permissions: 600)
- Device tracking - see which devices have CLI access in web app
- `bragdoc login` - Authenticate with web app
- `bragdoc logout` - Remove local token
- `bragdoc auth status` - Check authentication status and token expiration

**Project Management**
- `bragdoc init` - Quick setup: initialize current directory as a BragDoc project
- `bragdoc projects add [path]` - Add a project with custom settings
- `bragdoc projects list` - See all configured projects and their schedules
- `bragdoc projects update [path]` - Modify project settings
- `bragdoc projects enable/disable [path]` - Toggle automatic extraction
- `bragdoc projects remove [path]` - Remove a project from tracking

**Achievement Extraction**
- `bragdoc extract` - Extract achievements from current project now
- `bragdoc extract --dry-run` - Preview what would be extracted without sending to API
- `bragdoc extract --max-commits 500` - Override default commit limit
- `bragdoc extract --branch feature/new-ui` - Extract from specific branch
- `bragdoc extract --no-cache` - Force reprocess all commits (ignore cache)

**Multi-Repository Support**
- Manage unlimited repositories from a single CLI installation
- Each project can have different settings (max commits, schedule, enabled status)
- Enable/disable specific repositories without removing them
- Batch process commits across all enabled repositories
- Per-repository extraction limits to manage API usage
- Automatic sync with web app - CLI projects link to web app projects

**Automatic Scheduling**
- Configure extraction schedule when adding a project (hourly, daily, custom cron)
- Automatic crontab installation on Unix/Mac systems
- Automatic Task Scheduler setup on Windows
- Runs extraction in background at configured times
- Logs stored in `~/.bragdoc/logs/combined.log`
- Update schedules with `bragdoc projects update --schedule`
- Example schedules:
  - Daily at 6 PM: `0 18 * * *`
  - Every 4 hours: `0 */4 * * *`
  - Weekdays at noon: `0 12 * * 1-5`

**Smart Caching & Performance**
- Local commit cache prevents reprocessing the same commits
- Cache stored per repository in `~/.bragdoc/cache/commits/`
- Dramatically reduces API calls and processing time
- Cache management: `bragdoc cache list`, `bragdoc cache clear`
- Configurable batch sizes (default: 10 commits per API call)
- Respects rate limits automatically
- Dry-run mode to see what would be extracted: `bragdoc extract --dry-run`

**LLM Provider Configuration**
- Local LLM provider configuration - no need to use web app's AI credits
- Supports multiple providers:
  - **OpenAI** (GPT-4, GPT-3.5, etc.)
  - **Anthropic** (Claude 3.5 Sonnet, Opus, etc.)
  - **Google** (Gemini models)
  - **DeepSeek** (Cost-effective option)
  - **Ollama** (Completely local, private AI)
  - **OpenAI-Compatible APIs** (any provider with OpenAI-compatible endpoint)
- `bragdoc llm show` - Display current LLM configuration
- `bragdoc llm set` - Configure or change LLM provider
- Store API keys locally in secure config file
- Use your own API keys and billing
- Choose the best model for your needs and budget

**Data Management**
- `bragdoc data fetch` - Sync latest data from web app (companies, projects, standups)
- `bragdoc data clear` - Clear local data cache
- Local caching reduces API calls and improves performance
- Automatic cache refresh when needed

**Flexible Configuration**
- YAML-based configuration file: `~/.bragdoc/config.yml`
- Per-repository settings (max commits, schedule, standup enrollment)
- Global settings (default time ranges, batch sizes, API URL)
- Git identity filtering
- Command-line flag overrides for one-off operations
- Example config structure:
```yaml
auth:
  token: "<your-token>"
  expiresAt: 1234567890
projects:
  - path: "/Users/you/projects/app1"
    name: "My App"
    enabled: true
    maxCommits: 300
    cronSchedule: "0 18 * * *"
    id: "project-uuid-from-web-app"
  - path: "/Users/you/projects/app2"
    name: "Client Project"
    enabled: true
    maxCommits: 500
    standupId: "standup-uuid"
standups:
  - id: "standup-uuid"
    name: "Team Standup"
    enabled: true
    cronSchedule: "35 9 * * 1-5"
llm:
  provider: "openai"
  openai:
    model: "gpt-4"
    apiKey: "<your-key>"
settings:
  defaultMaxCommits: 300
  maxCommitsPerBatch: 10
  apiBaseUrl: "https://app.bragdoc.ai"
```

**Cross-Platform Support**
- Works on macOS, Linux, and Windows
- Automatic detection of operating system for scheduling
- Unix/Mac: Uses system crontab
- Windows: Uses Task Scheduler (schtasks)
- Graceful handling of platform differences

#### Email Integration

**Inbound Email Processing**
- Email achievements directly to your BragDoc account
- AI-powered extraction from both plain text and HTML emails
- Automatic linking to projects and companies based on context
- Date and duration detection from email content
- Secure webhook integration with Mailgun
- Email sender verification for security

**Achievement Extraction**
- Natural language processing understands casual writing
- Extracts multiple achievements from a single email
- Identifies relevant metadata (dates, projects, impact)
- Handles various email formats and styles

#### User Interface & Experience

**Modern, Clean Design**
- Minimalist interface that doesn't get in your way
- Built with shadcn/ui components and Tailwind CSS
- Intuitive navigation structure with sidebar
- Consistent design patterns throughout
- Professional look suitable for work environments

**Dark Mode Support**
- Dark mode theme available
- Easy theme switching
- Optimized for reduced eye strain

**Responsive & Interactive**
- Works seamlessly on desktop, tablet, and mobile
- Interactive tables with sorting and filtering
- Real-time updates and feedback
- Loading states and progress indicators
- Smooth animations and transitions

**Smart Filtering & Search**
- Filter achievements by project, company, date range
- Sort by multiple criteria (date, impact, project)
- Combine multiple filters for precise results
- Quick access to filtered views
- Clean, organized data presentation

#### Authentication & Security

**Multiple Sign-In Options**
- Google OAuth for quick signup
- GitHub OAuth for developer-friendly authentication
- Email/password authentication
- Secure session management with NextAuth.js

**Security Features**
- JWT-based authentication for CLI
- Revocable CLI tokens with device tracking
- Secure webhook signature verification
- GDPR-compliant data handling
- Fine-grained access controls

**Privacy-Focused Architecture**

BragDoc is designed from the ground up to keep your code and work completely private:

- ✅ **Your code never leaves your machine** - CLI only reads git metadata (commit messages, not code)
- ✅ **You choose where AI runs** - Use your own LLM API keys, or run Ollama completely locally
- ✅ **Only achievements go to the cloud** - The web app only sees the final extracted achievements, not your git history
- ✅ **Optional 100% offline mode** - Self-host the web app + use local Ollama = zero cloud dependencies
- ✅ **Optional self-hosting** - Run your own BragDoc instance with complete control
- ✅ **Open source & auditable** - Verify exactly what data is sent where
- ✅ **Secure document sharing** - Anonymous links for sharing reports (optional, revocable)
- ✅ **Clear data deletion** - Export your data anytime, delete your account anytime
- ✅ **No third-party tracking** - Your data stays yours, never sold or shared

#### Subscription & Pricing

BragDoc offers flexible pricing to accommodate different usage patterns and AI preferences.

**Free Tier - Full Achievement Tracking**
- ✅ **CLI Installation** - Install and use the CLI on unlimited machines
- ✅ **Manual Achievement Entry** - Add achievements directly in the web app
- ✅ **Project & Company Management** - Organize work across unlimited projects and companies
- ✅ **Data Export/Import** - Full data portability in JSON format
- ✅ **Standup Configuration** - Set up standup automation in web app
- ✅ **Achievement Browsing** - View, search, filter all your achievements
- ✅ **All non-AI features** - Full CRUD operations on all data types

**Local AI (Free) - Bring Your Own LLM**
With the CLI, you can configure your own LLM provider and use BragDoc completely free:
- ✅ **Achievement Extraction** - Extract from commits using your own OpenAI/Anthropic/Google API key
- ✅ **Impact Assessment** - AI rates achievement importance using your LLM
- ✅ **Standup WIP Analysis** - AI analyzes uncommitted changes using your LLM
- ✅ **Ollama Support** - Use completely local, private AI (no API costs at all!)
- ✅ **Full Control** - Choose your model, manage your costs, keep your data local

**Paid Tier ($4.99/month or $44.99/year) - Cloud AI Features**
Use BragDoc's cloud AI infrastructure instead of managing your own:
- ✅ **Cloud-Based Achievement Extraction** - Extract achievements without CLI setup
- ✅ **Cloud Document Generation** - AI-powered weekly/monthly reports via web app
- ✅ **Email Integration** - Email achievements directly, AI extracts them automatically
- ✅ **No API Key Management** - We handle the AI infrastructure
- ✅ **Priority Support** - Dedicated support channel
- ✅ **Model Optimization** - We choose the best models for each task

**Hybrid Approach (Recommended)**
Many users combine both:
- Use CLI with your own LLM for achievement extraction (free, unlimited)
- Subscribe for cloud document generation ($4.99/month)
- Best of both worlds: local extraction, cloud reporting
- Maximum privacy: your code and git history stay local, only achievements in cloud

**Why So Cheap?**

We intentionally price BragDoc to be a no-brainer investment in your career:

- ✅ **Career-long tool** - Track your entire professional journey across jobs
- ✅ **Tremendous long-term value** - Years of achievements at your fingertips
- ✅ **Fair pricing** - Anyone could self-host with effort, but convenience is worth $5/month
- ✅ **Privacy-first** - We don't monetize your data, just provide a valuable service
- ✅ **Sustainable** - Covers our costs, stays independent, no VC pressure

**Early Beta Pricing**
- 🎁 Currently in beta - paid cloud AI features available **completely free**
- 🎁 Lock in early access pricing when we exit beta
- 🎁 Help shape the product with your feedback
- 🎁 All features unlocked during beta period
- 🎁 Test both local and cloud AI approaches

**The Complete Privacy Option (100% Free & Offline):**

For maximum privacy and zero cost, you can run everything locally:

1. Self-host the BragDoc web app on your own infrastructure
2. Configure CLI to point to your local instance
3. Configure CLI to use local Ollama LLM
4. Result: **Zero cloud dependencies, completely free, totally private**

This option is perfect for:
- Enterprise environments with strict security requirements
- Privacy-conscious developers
- Users who want complete control over their data
- Learning and experimentation

#### Open Source

**Self-Hosting**
- Complete source code available on GitHub
- Detailed setup instructions and documentation
- Deploy to your own infrastructure
- Full control over your data
- Community contributions welcome

**Transparency**
- Open roadmap and feature development
- Public issue tracking
- Community-driven feature requests
- Regular updates and improvements

### How CLI and Web App Work Together

BragDoc's power comes from the seamless integration between the CLI and web application:

**Typical Workflow:**

1. **Initial Setup (5 minutes)**
   - Install CLI: `npm install -g @bragdoc/cli`
   - Login: `bragdoc login` (opens browser)
   - Initialize projects: `bragdoc init` in each repository
   - Configure LLM (use your own API key, or use Ollama for free local AI)
   - Optional: Set up automatic extraction schedules

2. **Automatic Background Operation**
   - CLI runs on schedule (e.g., daily at 6 PM)
   - Extracts achievements from your commits
   - Analyzes impact using your configured LLM
   - Sends achievements to web app
   - Before standups: Extracts WIP and recent work, sends to web app

3. **Web App Review & Organization**
   - Open app.bragdoc.ai to see extracted achievements
   - Review, edit, or enhance AI-generated descriptions
   - Organize by project and company
   - Link related achievements together
   - Track impact over time with analytics dashboard

4. **Document Generation**
   - Click "For my manager" to generate a report
   - Select time range (this week, this month, this quarter)
   - AI analyzes your achievements and creates polished document
   - Edit and customize as needed
   - Share with manager or export for performance review

5. **Standup Mode**
   - Web app shows prepared standup notes 10 minutes before meeting
   - Review WIP from all your projects
   - See yesterday's achievements
   - Copy to Slack or present live in standup

**Key Integration Points:**

- **Authentication**: Login once in CLI, syncs with web app
- **Projects**: Projects added in CLI appear in web app automatically
- **Standups**: Configure in web app, CLI executes on schedule
- **Achievements**: CLI extracts → Web app organizes → Documents generated
- **Data Sync**: CLI fetches company/project data from web app for context
- **LLM**: Configure once in CLI, used for all local AI operations

**Use CLI For:**
- Automatic achievement extraction from git commits
- Standup preparation and WIP analysis
- Local AI processing with your own API keys
- Scheduled background operations
- Private repository access

**Use Web App For:**
- Reviewing and organizing achievements
- Manual achievement entry
- Document generation ("For my manager" reports)
- Project and company management
- Analytics and impact tracking
- Standup note review

### Coming Soon

BragDoc is actively being developed, and we have exciting features on the roadmap. Here's what's coming next:

#### Performance Reviews
- Comprehensive performance review self-assessment generation
- AI-powered analysis of achievements across review periods
- Multi-period comparison (annual, bi-annual reviews)
- Structured review document templates
- Skills and competencies tracking
- Goal-setting and progress tracking
- 360-degree feedback integration

#### Workstreams
- Organize work into thematic workstreams
- Track multiple concurrent workstreams
- Workstream-specific achievement views
- Cross-workstream impact analysis
- Resource allocation tracking
- Workstream timelines and milestones

#### Advanced Document Types
- Quarterly impact reports for leadership
- Annual review preparation documents
- Skip-level manager summaries
- Custom document templates
- Team contribution reports
- Project retrospectives

#### Enhanced Email Integration
- Outbound email notifications
- Weekly/monthly achievement summary emails
- Email reminders to log achievements
- Configurable email preferences
- Email templates for different document types

#### Advanced Analytics
- Achievement trends over time
- Comparative analytics across projects
- Impact distribution visualizations
- Productivity insights
- Team contribution metrics (for managers)
- Custom reporting dashboards

#### Collaboration Features
- Share achievements with team members
- Collaborative document editing
- Team achievement aggregation (for managers)
- Comment threads on achievements
- Achievement verification and endorsements

#### Enhanced Search
- Full-text search across all achievements
- Natural language search queries
- Save and share custom search filters
- Advanced search operators
- Search across documents and achievements

### Pricing

BragDoc is an open source application with a hosted version offering both free and paid tiers. The key distinction: you can use BragDoc completely free by configuring your own LLM provider in the CLI, or subscribe to use our cloud-based AI infrastructure.

**Privacy-First Architecture:**
- ✅ Your code never leaves your machine (CLI only reads git metadata)
- ✅ You choose where AI runs (your API keys or local Ollama)
- ✅ Only achievements sent to cloud (not your git history or code)
- ✅ 100% offline option available (self-hosted + local Ollama)

**Free Forever:**
- Web application account (unlimited achievements, projects, companies)
- CLI installation on unlimited machines
- Manual achievement entry and organization
- Data export/import for full portability
- **Local AI option**: Configure your own OpenAI/Anthropic/Google API key in the CLI
- **Completely local AI**: Use Ollama for 100% private, free AI processing
- All non-AI features fully functional

**Local AI (Free) - Recommended for Privacy & Cost Control:**
- Extract achievements using your own LLM provider
- Configure once with `bragdoc llm set`
- Supports: OpenAI, Anthropic, Google, DeepSeek, Ollama, any OpenAI-compatible API
- You control costs (typically $0.01-0.05 per 100 commits), choose models, keep data local
- Perfect for: privacy-conscious users, cost optimization, custom models

**Cloud AI Subscription ($4.99/month or $44.99/year):**
- Cloud-based AI document generation ("For my manager" reports)
- Email-to-achievement extraction
- No API key management required
- Optimized model selection for each task
- Priority support
- Perfect for: users who prefer hands-off AI, don't want to manage API keys

**Hybrid Approach (Recommended):**
- Use CLI with your own LLM for extraction (free, unlimited, private)
- Subscribe for cloud document generation ($4.99/month)
- Best of both: local privacy, cloud convenience

**Why So Cheap?**
- Career-long tool - invaluable over time
- Fair pricing - convenience over complexity
- Privacy-first - we don't sell your data
- Sustainable - covers costs, stays independent

**Flexible Upgrade/Downgrade:**
- Upgrade or downgrade between free and paid at any time
- No contracts or commitments
- Pro-rated billing

**Current Status - Early Beta:**
- 🎉 Payment system not yet active
- 🎉 All cloud AI features currently FREE during beta
- 🎉 Test everything before committing
- 🎉 Lock in early pricing when we launch
- Banner on marketing site will indicate beta status

**The Complete Privacy Option (100% Free & Offline):**

For maximum privacy and zero cost:
1. Self-host the BragDoc web app on your infrastructure
2. Configure CLI to point to your local instance
3. Configure CLI to use local Ollama LLM
4. **Result: Zero cloud dependencies, completely free, totally private**

Perfect for: enterprises, security-sensitive environments, complete data control

**Open Source Self-Hosting:**
BragDoc is fully open source. Run your own instance with complete control:
- Full source code: https://github.com/edspencer/bragdoc-ai
- Detailed setup instructions included
- Deploy to your own infrastructure (Docker, Vercel, Cloudflare, etc.)
- Community contributions welcome
- Fork, customize, and extend as needed

## Pages

Below is the complete page structure for the BragDoc marketing site. Each page includes URL, title, detailed content outline, and specific screenshot requirements with instructions for the @agent-web-app-tester.

### 1. Homepage (`/`)

**Title**: BragDoc - Your AI-Powered Achievement Tracker

**Primary Goal**: Convert visitors to sign-ups within 30 seconds of landing

**Hero Section**:
- **Headline**: "Never Forget What You've Accomplished"
- **Subheadline**: "Automatically track your work achievements from git commits. Always be ready for standups, 1-on-1s, and performance reviews."
- **CTA Buttons**:
  - Primary: "Start Tracking Free" (links to app.bragdoc.ai/register)
  - Secondary: "See How It Works" (scrolls to demo section)
- **Hero Visual**: Large screenshot showing the achievements dashboard with multiple achievements listed

**Screenshot Requirements**:
```
Hero Screenshot - Achievements Dashboard:
@agent-web-app-tester instructions:
1. Navigate to https://app.bragdoc.ai/achievements
2. Ensure you have at least 8-10 diverse achievements visible
3. Make sure achievements have varying impact levels (different star ratings)
4. Include achievements from multiple projects (different colored project tags)
5. Ensure dates span at least a few weeks
6. Take full viewport screenshot (1920x1080)
7. Capture in BOTH light and dark mode
```

**Problem/Solution Section**:
- **Problem Statement**: "As a knowledge worker, your impact is invisible"
  - Bullet points about forgetting achievements, unprepared standups, difficult performance reviews
- **Solution Statement**: "BragDoc tracks your work automatically"
  - How CLI extracts from git commits
  - How web app organizes and presents

**Three-Column Feature Preview**:
1. **Auto-Extract** - CLI analyzes your commits
2. **AI-Organize** - Intelligent achievement categorization
3. **AI-Document** - Generate reports for managers

**Screenshot Requirements**:
```
Feature 1 - CLI in Action:
@agent-web-app-tester instructions:
Not a web-app screenshot - use a terminal screenshot showing:
`bragdoc extract` command output with achievements being extracted
```

```
Feature 2 - Projects Organization:
@agent-web-app-tester instructions:
1. Navigate to https://app.bragdoc.ai/projects
2. Ensure at least 4-5 projects are visible with different colors
3. Show projects linked to different companies
4. Include achievement counts for each project
5. Take screenshot (1200x800)
```

```
Feature 3 - Document Generation:
@agent-web-app-tester instructions:
1. Navigate to https://app.bragdoc.ai/documents
2. If no documents exist, generate one first via "For My Manager" page
3. Open a generated document showing polished achievement summary
4. Take screenshot showing the formatted document
5. Capture in reading view (not edit mode)
```

**Social Proof Section** (Post-Beta):
- Currently: "Join developers who are already tracking their impact"
- Later: Testimonials, usage stats (when available)

**Privacy Callout**:
- Prominent section: "Your code never leaves your machine"
- Brief explanation with link to /privacy page

**Final CTA Section**:
- "Start Building Your Achievement History Today"
- CTA buttons + link to CLI installation docs

---

### 2. Features Page (`/features`)

**Title**: BragDoc Features - Comprehensive Achievement Tracking

**Overview Section**:
- Brief intro: "BragDoc combines powerful CLI automation with a beautiful web interface"
- Two-column layout: CLI features | Web App features

**Detailed Feature Sections** (each with screenshot):

#### 1. Automatic Git Extraction
- **Description**: CLI extracts achievements from your git commits using AI
- **Key Points**:
  - Analyzes commit messages and metadata
  - Works with any git repository (public, private, on-premise)
  - Your code never leaves your machine
  - Intelligent caching prevents reprocessing
- **Screenshot**: CLI output showing extraction in progress

```
@agent-web-app-tester instructions:
This requires a terminal screenshot, not web app:
Show `bragdoc extract` command with output showing:
- "Analyzing commits..." message
- Progress indicator
- "Found 5 achievements" summary
- Example achievement extracted
```

#### 2. Achievement Dashboard
- **Description**: Centralized view of all your accomplishments
- **Key Points**:
  - Sort by date, impact, project
  - Filter by company, date range, project
  - Inline editing and rating
  - Color-coded projects
- **Screenshot**: Full achievements page with filters active

```
@agent-web-app-tester instructions:
1. Navigate to https://app.bragdoc.ai/achievements
2. Apply at least one filter (e.g., select a specific project)
3. Ensure sort dropdown is visible
4. Show achievement list with mixed impact ratings
5. Capture with at least 10 achievements visible
6. Take screenshot at 1920x1080
```

#### 3. Project & Company Organization
- **Description**: Organize your work by projects and employers
- **Key Points**:
  - Link achievements to specific projects
  - Track multiple companies/employers
  - GitHub integration for repositories
  - Visual color coding
- **Screenshot**: Projects page showing multiple projects

```
@agent-web-app-tester instructions:
1. Navigate to https://app.bragdoc.ai/projects
2. Ensure 5-6 projects visible with varied colors
3. Show achievement counts per project
4. Include at least one project with GitHub integration (repo URL visible)
5. Show company associations
6. Take screenshot at 1920x1080
```

#### 4. Standup Mode
- **Description**: Never be unprepared for standup again
- **Key Points**:
  - Automatic WIP extraction before standup time
  - Recent achievements included
  - Multi-repository aggregation
  - Formatted for easy reading
- **Screenshot**: Standup page showing prepared notes

```
@agent-web-app-tester instructions:
1. Navigate to https://app.bragdoc.ai/standups
2. Create or navigate to a standup with prepared notes
3. Show the standup summary with WIP and recent achievements
4. Ensure both "Work in Progress" and "Recent Achievements" sections are visible
5. Take screenshot showing the formatted output
```

#### 5. AI-Powered Document Generation
- **Description**: Generate polished reports for your manager
- **Key Points**:
  - Weekly, monthly, or custom time ranges
  - AI analyzes and organizes your achievements
  - Professional formatting
  - Editable and customizable
- **Screenshot**: Generated document view

```
@agent-web-app-tester instructions:
1. Navigate to https://app.bragdoc.ai/documents
2. Open a generated "For My Manager" document
3. Show the polished, formatted document with sections
4. Ensure multiple achievements are visible, organized by theme or project
5. Take screenshot in reading mode (not editing)
6. Capture at 1920x1080
```

#### 6. Impact Tracking & Analytics
- **Description**: Visualize your impact over time
- **Key Points**:
  - Impact points trending
  - Achievement distribution
  - Project contribution breakdown
  - Timeline visualization
- **Screenshot**: Dashboard showing impact charts

```
@agent-web-app-tester instructions:
1. Navigate to https://app.bragdoc.ai (main dashboard)
2. Ensure impact chart is visible with data points
3. Show achievement count trends
4. Capture any visible analytics widgets
5. Take screenshot at 1920x1080
```

#### 7. CLI Power Tools
- **Description**: Terminal-based workflow automation
- **Key Points**:
  - One-time setup, runs automatically
  - Cron/Task Scheduler integration
  - Multiple LLM providers supported
  - Offline-capable with Ollama
- **Screenshot**: Terminal showing CLI commands and config

```
@agent-web-app-tester instructions:
Not web app - terminal screenshots showing:
1. `bragdoc --help` output
2. `bragdoc projects list` showing configured projects
3. `bragdoc llm show` showing LLM configuration
Combine into single composite image if possible
```

#### 8. Data Export & Portability
- **Description**: Your data, your control
- **Key Points**:
  - Export everything to JSON
  - Import from previous exports
  - No vendor lock-in
  - Backup anytime
- **Screenshot**: Data export/import interface

```
@agent-web-app-tester instructions:
1. Navigate to https://app.bragdoc.ai/settings or data export page
2. Show the export data interface
3. Capture button/interface for exporting achievements
4. Take screenshot showing export options
```

**Bottom CTA**: "See all features in action" → Link to /how-it-works

---

### 3. How It Works Page (`/how-it-works`)

**Title**: How BragDoc Works - From Commits to Career Documents

**Overview Section**:
- "BragDoc is a two-part system: powerful CLI + beautiful web interface"
- Diagram showing: Git Commits → CLI → AI → Web App → Documents

**Step-by-Step Walkthrough**:

#### Step 1: Install the CLI (2 minutes)
- Code snippet: `npm install -g @bragdoc/cli`
- Code snippet: `bragdoc login`
- **Screenshot**: Terminal showing successful installation

```
@agent-web-app-tester instructions:
Terminal screenshot showing:
1. `npm install -g @bragdoc/cli` command with success output
2. `bragdoc login` command with "Authentication successful" message
```

#### Step 2: Initialize Your Projects (1 minute per project)
- Code snippet: `cd ~/projects/my-app && bragdoc init`
- Explanation of project configuration
- **Screenshot**: Terminal showing project initialization

```
@agent-web-app-tester instructions:
Terminal screenshot showing:
`bragdoc init` output with:
- "Detected git repository: my-app"
- "Project added successfully"
- "Would you like to set up automatic extraction? (y/n)"
```

#### Step 3: Configure Your LLM (1 minute)
- Code snippet: `bragdoc llm set`
- Explanation of provider options (OpenAI, Anthropic, Ollama, etc.)
- Cost transparency note
- **Screenshot**: Terminal showing LLM configuration wizard

```
@agent-web-app-tester instructions:
Terminal screenshot showing:
`bragdoc llm set` interactive prompt with:
- Provider selection menu
- Model selection
- API key input prompt
```

#### Step 4: Extract Your First Achievements (30 seconds)
- Code snippet: `bragdoc extract`
- Explanation of what happens (git log → AI analysis → achievements)
- **Screenshot**: CLI extraction in progress

```
@agent-web-app-tester instructions:
Terminal screenshot showing:
`bragdoc extract` with output:
- "Analyzing last 90 days of commits..."
- Progress indicators
- "Found 12 achievements from 47 commits"
- Sample extracted achievement
```

#### Step 5: Review in Web App
- Navigate to app.bragdoc.ai/achievements
- Review, edit, organize
- **Screenshot**: Achievements list with newly extracted items

```
@agent-web-app-tester instructions:
1. Navigate to https://app.bragdoc.ai/achievements
2. Show achievements list with recent extractions (ideally with "New" badge or recent dates)
3. Capture some achievements with visible edit/delete buttons
4. Take screenshot at 1920x1080
```

#### Step 6: Set Up Automation (Optional, 2 minutes)
- Configure automatic extraction schedule
- Set up standup automation
- **Screenshot**: Web app standup configuration

```
@agent-web-app-tester instructions:
1. Navigate to standup configuration page in web app
2. Show form for creating/editing a standup
3. Capture time picker, project enrollment options
4. Take screenshot showing configuration interface
```

#### Step 7: Generate Documents
- Click "For My Manager"
- Select time range
- AI generates polished report
- **Screenshot**: Document generation flow

```
@agent-web-app-tester instructions:
1. Navigate to https://app.bragdoc.ai/documents/generate or "For My Manager" page
2. Show the generation interface with time range selector
3. Capture the form/options before generation
4. Take screenshot at 1920x1080
```

**Privacy Architecture Diagram**:
- Visual diagram showing:
  - Your Machine: Git repos → CLI → Your LLM
  - BragDoc Cloud: Only achievements → Web app
  - Self-Hosted Option: Everything on your infrastructure
- **Screenshot**: Not needed - create diagram

**Real-World Workflow Examples**:
1. **Daily Developer**: Sets up automatic extraction at 6 PM daily
2. **Standup Hero**: CLI runs at 9:45 AM, prepares standup notes
3. **Performance Review Prep**: Generates quarterly reports for manager
4. **Privacy-First User**: Self-hosted + Ollama, 100% offline

**Bottom CTA**: "Ready to start?" → Sign up button

---

### 4. Pricing Page (`/pricing`)

**Title**: BragDoc Pricing - Simple, Transparent

**Beta Banner**:
- Prominent banner: "🎉 Early Beta - Try BragDoc free during beta"
- "Lock in early pricing when we launch"

**Overview**:
"One simple price for the full BragDoc experience. Try it free, upgrade when you're ready."

**Two-Tier Pricing**:

#### Tier 1: Free Account
- **Price**: $0/month
- **Headline**: "Try BragDoc"
- **Features**:
  - ✅ Web app account
  - ✅ Manual achievement entry
  - ✅ Project organization
  - ✅ Data export (JSON, CSV, MD)
  - ✅ Browse and search achievements
  - ❌ AI-powered git extraction
  - ❌ AI document generation
  - ❌ Standup automation
  - ❌ Performance review generation
  - ❌ Impact assessment
- **CTA**: "Start Free" → app.bragdoc.ai/register
- **Note**: "Perfect for trying BragDoc and manual tracking"

#### Tier 2: Full Account - HIGHLIGHTED
- **Price**: $4.99/month or $44.99/year (save 25%)
- **Headline**: "Full BragDoc Experience"
- **Banner**: "Everything you need"
- **Features**:
  - ✅ Everything in Free account
  - ✅ **AI git extraction** - Automatic achievement extraction from commits
  - ✅ **AI document generation** - "For My Manager" reports
  - ✅ **Standup automation** - Automated daily standup notes
  - ✅ **Performance reviews** - AI-generated review content
  - ✅ **Impact assessment** - AI rates achievement impact
  - ✅ **Email integration** - Extract achievements from emails
  - ✅ CLI tool for automation
  - ✅ Priority support
- **CTA**: "Start Free" → app.bragdoc.ai/register (can upgrade later)

**Open Source Alternative Section**:
- **Headline**: "Don't Want to Pay? Self-Host for Free"
- **Description**:
  - BragDoc is open source (MIT license)
  - Self-host the web app on your infrastructure
  - Use local LLMs (Ollama) for 100% free AI features
  - Complete control over your data
  - Zero ongoing costs
- **Perfect for**:
  - Privacy-conscious developers
  - Enterprises with strict data policies
  - Those who prefer self-hosting
  - Learning and educational use
- **CTA**: "View Self-Hosting Guide" → Link to GitHub docs

**Comparison Table**:
Feature comparison showing: Free Account vs Full Account vs Self-Hosted

| Feature | Free Account | Full Account | Self-Hosted (Open Source) |
|---------|--------------|--------------|---------------------------|
| Manual achievement entry | ✅ | ✅ | ✅ |
| Project organization | ✅ | ✅ | ✅ |
| Data export | ✅ | ✅ | ✅ |
| AI git extraction | ❌ | ✅ | ✅ (with own LLM) |
| AI document generation | ❌ | ✅ | ✅ (with own LLM) |
| Standup automation | ❌ | ✅ | ✅ (with own LLM) |
| Performance reviews | ❌ | ✅ | ✅ (with own LLM) |
| Cloud hosting | ✅ | ✅ | ❌ (you host) |
| Your infrastructure | ❌ | ❌ | ✅ |
| Monthly cost | $0 | $4.99 | $0 (your infrastructure costs) |

**Why $4.99/month?**:
- Career-long tool with tremendous long-term value
- Fair pricing - one simple tier, no upsells
- AI features are expensive to run, but we keep costs low
- Open source alternative available if you prefer self-hosting
- Sustainable and independent (no VC pressure)

**FAQ Section**:
- Can I try before paying? (Yes, free account lets you explore)
- Can I upgrade/downgrade? (Yes, anytime, no lock-in)
- What if I want to self-host? (Completely free, open source, MIT license)
- What about enterprise pricing? (Self-host or contact us for volume discounts)
- How does billing work? (Monthly or annual, cancel anytime, no pro-rating)
- What happens if I cancel? (Keep free account, all your data stays, can re-upgrade anytime)

**Bottom CTA**: "Start free today" → Sign up

---

### 5. CLI Documentation Page (`/cli`)

**Title**: BragDoc CLI - Your Achievement Extraction Engine

**Introduction**:
- What is the CLI and why it exists
- Privacy-first architecture explanation
- Installation requirements (Node.js 18+)

**Quick Start**:
```bash
# Install
npm install -g @bragdoc/cli

# Authenticate
bragdoc login

# Initialize project
bragdoc init

# Extract achievements
bragdoc extract
```

**Screenshot Requirements**:
```
@agent-web-app-tester instructions:
Terminal screenshot showing quick start sequence:
1. Installation output
2. Login success message
3. Init success message
4. Extract with sample output
Combine into single walkthrough image
```

**Command Reference** (detailed for each):

#### Authentication Commands
- `bragdoc login` - Complete OAuth flow
- `bragdoc logout` - Remove local token
- `bragdoc auth status` - Check auth status

#### Project Management
- `bragdoc init` - Quick project setup
- `bragdoc projects add [path]` - Add with options
- `bragdoc projects list` - Show all projects
- `bragdoc projects update` - Modify settings
- `bragdoc projects enable/disable` - Toggle extraction
- `bragdoc projects remove` - Remove project

#### Achievement Extraction
- `bragdoc extract` - Extract from current project
- `bragdoc extract --dry-run` - Preview mode
- `bragdoc extract --max-commits 500` - Custom limit
- `bragdoc extract --branch feature` - Specific branch
- `bragdoc extract --no-cache` - Force reprocess

#### Standup Commands
- `bragdoc standup enable` - Enroll in standup
- `bragdoc standup wip` - Manual WIP extraction
- `bragdoc standup status` - Check enrollment
- `bragdoc standup disable` - Unenroll

#### LLM Configuration
- `bragdoc llm show` - Display current config
- `bragdoc llm set` - Configure provider

#### Data Management
- `bragdoc data fetch` - Sync from web app
- `bragdoc data clear` - Clear local cache
- `bragdoc cache list` - Show cached commits
- `bragdoc cache clear` - Clear commit cache

**Configuration Guide**:
- YAML config file location: `~/.bragdoc/config.yml`
- Example config with annotations
- Security note about file permissions (600)

**LLM Provider Setup**:
Detailed guide for each provider:
1. OpenAI (API key from platform.openai.com)
2. Anthropic (API key from console.anthropic.com)
3. Google (Gemini API key)
4. DeepSeek (Cost-effective option)
5. Ollama (Local, free setup)
6. OpenAI-Compatible (Custom endpoints)

**Scheduling Guide**:
- **Unix/Mac**: Cron syntax and examples
- **Windows**: Task Scheduler instructions
- Common schedules:
  - Daily at 6 PM: `0 18 * * *`
  - Every 4 hours: `0 */4 * * *`
  - Weekdays at noon: `0 12 * * 1-5`

**Privacy & Security**:
- What data the CLI accesses (git metadata only)
- What is sent to your LLM (commit messages, dates, authors)
- What is sent to BragDoc cloud (only achievements)
- Token storage and security
- Self-hosting option for complete control

**Troubleshooting**:
- Common issues and solutions
- Log locations: `~/.bragdoc/logs/`
- Debug mode instructions
- Support resources

**Bottom CTA**: "Install CLI now" + code snippet

---

### 6. Privacy Page (`/privacy`)

**Title**: Privacy First - How BragDoc Protects Your Code and Data

**Overview**:
- "We believe your code and work should be completely private"
- "BragDoc is designed from the ground up with privacy as the foundation"

**Architecture Diagram**:
Visual showing three layers:
1. **Your Machine**: Code stays here (never sent anywhere)
2. **Your LLM**: Git metadata analyzed here (you choose provider)
3. **BragDoc Cloud**: Only achievements stored here (you control)

**What We DO Access**:
- ✅ Extracted achievements (text descriptions only)
- ✅ Achievement metadata (dates, project names, impact ratings)
- ✅ Project information (names, companies, dates)
- ✅ User account information (email, name, preferences)

**What We NEVER See**:
- ❌ Your source code
- ❌ Your git diffs
- ❌ File contents
- ❌ Repository structure
- ❌ Proprietary information
- ❌ Trade secrets

**How It Works - Technical Details**:

#### CLI Privacy Design
1. **Local Git Analysis**: CLI runs `git log --author="Your Name"` locally
2. **Metadata Only**: Extracts commit messages, dates, authors, files changed
3. **Your LLM Choice**: Sends metadata to LLM provider YOU configure
4. **Achievement Extraction**: LLM returns achievement descriptions only
5. **Minimal Cloud Storage**: Only achievements sent to BragDoc web app

#### Code Example:
```typescript
// What CLI extracts (metadata only):
{
  commitHash: "a1b2c3d",
  message: "Add user authentication",
  date: "2025-01-15",
  author: "Your Name",
  filesChanged: ["auth.ts", "user.ts"]
}

// What is sent to your LLM:
"Analyze this commit message and extract achievements:
Commit: Add user authentication
Files: auth.ts, user.ts
Date: 2025-01-15"

// What your LLM returns:
"Implemented secure user authentication system"

// What is sent to BragDoc cloud:
{
  title: "Implemented secure user authentication system",
  date: "2025-01-15",
  impact: 8
}
```

**LLM Provider Privacy**:
- You choose where your data is processed
- Use major cloud providers (OpenAI, Anthropic, Google) - subject to their privacy policies
- Use **Ollama for 100% local processing** - nothing leaves your machine
- Use custom on-premise OpenAI-compatible endpoints
- Review each provider's privacy policy (we link to them)

**100% Offline Mode**:
Step-by-step guide to running BragDoc with zero cloud dependencies:
1. Self-host BragDoc web app
2. Install Ollama locally
3. Configure CLI to use local Ollama
4. Point CLI at self-hosted web app
5. Result: **Complete privacy, zero cloud, zero cost**

**Data Control**:
- **Export Anytime**: Download all your data as JSON
- **Delete Anytime**: Permanent account deletion
- **Revoke Access**: Remove CLI tokens from any device
- **Audit Logs**: See what data was accessed (coming soon)

**Security Measures**:
- Encrypted data transmission (TLS)
- Secure token storage (file permissions: 600)
- JWT-based authentication with expiration
- Webhook signature verification
- Regular security audits
- No third-party tracking scripts

**Open Source Transparency**:
- Full source code available: github.com/edspencer/bragdoc-ai
- Audit exactly what data is sent where
- Community security reviews welcome
- Transparent development process

**Compliance**:
- GDPR compliant
- Data export/deletion rights
- Clear data retention policies
- No data selling or sharing
- Transparent privacy policy

**Comparison with Alternatives**:
Table showing privacy features:
- BragDoc: Code stays local ✅ | Choose LLM ✅ | 100% offline option ✅
- Alternative A: Cloud extraction ❌ | Fixed LLM ❌ | No offline mode ❌
- Alternative B: etc.

**FAQ**:
- Does BragDoc access my code? (No, only commit metadata)
- Where is my data stored? (US-based servers, or self-hosted)
- Can I use this with proprietary code? (Yes, code never leaves your machine)
- What about enterprise requirements? (Self-hosting available)
- Do you sell data? (Never. Our business model is subscriptions.)

**Bottom CTA**: "See how it works" → Link to /how-it-works

---

### 7. About / Why BragDoc Page (`/about`)

**Title**: Why BragDoc Exists - The Problem We're Solving

**The Problem Section**:

#### Knowledge Work is Invisible
- "Unlike manufacturing or sales, your impact doesn't create physical artifacts"
- "At the end of the day, what do you have to show for your work?"
- "Commits disappear into history, tickets get closed, your impact fades"

#### The Forgetting Curve
- "Remember what you did 3 months ago? How about 6 months?"
- "When performance review time comes, you scramble to remember"
- "Your memory favors recent work, erasing historical impact"

#### Undervaluing Your Work
- "Without records, you undersell your contributions"
- "Promotions and raises go to those who can articulate impact"
- "Your manager doesn't know what they don't see documented"

#### The Standup Problem
- "9 AM standup, you can't remember what you did yesterday"
- "You fumble through vague descriptions"
- "You appear less productive than you actually are"

**The Origin Story**:
- "I built BragDoc because I lived this problem"
- Personal anecdote about missing promotion opportunity
- "I couldn't articulate my impact because I hadn't tracked it"
- "I vowed never to let my work disappear again"

**The Solution Philosophy**:

#### Automatic Beats Manual
- "Manual tracking fails because humans forget"
- "Automatic extraction from git commits is reliable"
- "Your commit history is a perfect record of what you built"

#### Privacy First
- "I would never use a tool that sent my code to the cloud"
- "BragDoc was designed for developers by a developer"
- "Your code stays on your machine, always"

#### Career-Long Investment
- "This isn't a monthly subscription you'll cancel"
- "This is a career-long archive of your professional growth"
- "In 10 years, you'll have a complete record of your impact"

#### Open Source
- "Proprietary tools for career records felt wrong"
- "Open source means transparency, trust, and longevity"
- "Fork it, self-host it, audit it - it's yours"

**What Makes BragDoc Different**:

#### Not Just a TODO App
- "Achievements ≠ tasks completed"
- "BragDoc tracks impact, not just activity"
- "AI understands significance, not just what you did"

#### Not Just a Journal
- "Manual journaling fails because life gets busy"
- "BragDoc runs silently in the background"
- "Set it up once, benefits for years"

#### Not Just Performance Review Prep
- "Daily standups need this too"
- "Weekly 1-on-1s with your manager"
- "Monthly updates to leadership"
- "Quarterly goal setting and retrospectives"

**The Team** (or "The Creator"):
- Brief bio of creator(s)
- Why we're qualified to solve this problem
- Our commitment to users and privacy

**Our Values**:
- **Privacy First**: Your code and work are yours
- **Fair Pricing**: Career-long tool priced fairly
- **User Control**: Open source, self-hosting, data export
- **Sustainability**: No VC pressure, build for the long term
- **Ethical Marketing**: No fake testimonials or inflated claims

**The Vision**:
- "Every knowledge worker should have a complete record of their impact"
- "Career transitions should be data-driven, not memory-based"
- "Promotions and raises should go to those with documented impact"
- "BragDoc makes this possible"

**Bottom CTA**: "Start building your achievement history" → Sign up

---

### 8. Use Cases Page (`/use-cases`)

**Title**: BragDoc Use Cases - How Different Professionals Use It

**Overview**:
"BragDoc adapts to your workflow, whether you're a developer, manager, freelancer, or consultant"

**Use Case 1: Software Developers**

**The Problem**:
- Too busy coding to document accomplishments
- Standups catch you off-guard
- Performance reviews require memory archeology

**How BragDoc Helps**:
- ✅ CLI automatically extracts achievements from commits
- ✅ Standup mode prepares notes 10 minutes before meeting
- ✅ Performance review time: 6 months of work documented
- ✅ Promotion packet: specific, quantified achievements

**Workflow**:
1. Install CLI, set up automatic extraction (daily at 6 PM)
2. Enable standup mode for 9:45 AM daily
3. Review achievements weekly in web app
4. Generate monthly report for manager
5. At review time: export 6-12 months of achievements

**Screenshot Requirements**:
```
@agent-web-app-tester instructions:
1. Show achievements list filtered to a 1-month period
2. Highlight high-impact achievements (8+ stars)
3. Show project associations and dates
4. Take screenshot demonstrating review-ready data
```

**Use Case 2: Engineering Managers**

**The Problem**:
- Tracking your own contributions while managing others
- Preparing skip-level reports
- Communicating team impact to leadership

**How BragDoc Helps**:
- ✅ Track your own code contributions
- ✅ Manual achievement entry for management work (1-on-1s, hiring, planning)
- ✅ Generate leadership reports showing team + individual impact
- ✅ Standups: show your work alongside team updates

**Workflow**:
1. CLI tracks your code commits
2. Manually log: "Hired 2 senior engineers", "Reduced sprint velocity variability by 30%"
3. Organize achievements by category: Technical, People, Process
4. Monthly: Generate report for director showing combined impact

**Screenshot Requirements**:
```
@agent-web-app-tester instructions:
1. Show achievements list with mix of technical and management achievements
2. Demonstrate manual entry interface (Add Achievement button/form)
3. Show a generated document with mixed achievement types
```

**Use Case 3: Freelancers & Consultants**

**The Problem**:
- Multiple concurrent clients and projects
- Need to demonstrate ROI to clients
- Portfolio building for new client acquisition

**How BragDoc Helps**:
- ✅ Multi-repository support (one repo per client)
- ✅ Company management (track all clients)
- ✅ Per-client achievement summaries
- ✅ Generate client-specific reports

**Workflow**:
1. Add each client project: `bragdoc projects add ~/clients/acme`
2. Organize achievements by company (client)
3. Generate monthly reports per client
4. Portfolio building: export all achievements by client

**Screenshot Requirements**:
```
@agent-web-app-tester instructions:
1. Navigate to Companies page
2. Show multiple companies with achievements
3. Filter achievements by a specific company
4. Show company-specific achievement count
```

**Use Case 4: Career Transitioners**

**The Problem**:
- Resume needs to demonstrate impact, not just responsibilities
- Interviews require specific examples (STAR method)
- Forgetting past achievements from previous roles

**How BragDoc Helps**:
- ✅ Years of documented achievements for resume building
- ✅ Specific examples ready for behavioral interviews
- ✅ Quantified impact statements for resume bullets
- ✅ Data export for resume generation tools

**Workflow**:
1. Track achievements continuously throughout current role
2. At job search time: filter last 2-3 years
3. Export high-impact achievements
4. Craft resume bullets from documented achievements
5. Interview prep: review by competency area

**Screenshot Requirements**:
```
@agent-web-app-tester instructions:
1. Show achievements filtered by date range (e.g., "Last 2 years")
2. Show achievements sorted by impact (highest first)
3. Demonstrate export functionality (if visible in UI)
```

**Use Case 5: Remote Workers**

**The Problem**:
- Visibility challenge: manager doesn't see you working
- Async communication requires clear updates
- Need to over-communicate impact without seeming boastful

**How BragDoc Helps**:
- ✅ Automatic tracking provides receipts for work done
- ✅ Weekly reports keep manager informed
- ✅ Standup notes perfect for async standup channels
- ✅ Data-driven visibility into contributions

**Workflow**:
1. Automatic extraction runs daily
2. Friday: Generate weekly report, send to manager
3. Async standup: Use standup mode to generate update
4. Monthly 1-on-1: Reference achievement dashboard

**Screenshot Requirements**:
```
@agent-web-app-tester instructions:
1. Show a generated weekly report document
2. Demonstrate standup notes formatted for Slack/async channel
3. Take screenshot of recent achievements (last 7 days filter)
```

**Use Case 6: Privacy-Conscious Enterprise Developers**

**The Problem**:
- Cannot use cloud tools due to security policies
- Proprietary code cannot be processed by external APIs
- Need achievement tracking without compromising IP

**How BragDoc Helps**:
- ✅ Self-host BragDoc web app on-premise
- ✅ CLI uses local Ollama LLM (nothing leaves network)
- ✅ 100% air-gapped deployment possible
- ✅ Open source for security audits

**Workflow**:
1. Deploy BragDoc to internal Kubernetes cluster
2. Install Ollama on developer machines
3. Configure CLI to use local Ollama and on-premise BragDoc
4. Extract achievements without any external API calls

**Screenshot Requirements**:
```
Not web-app specific - show architecture diagram of on-premise deployment
```

**Comparison Table**:
| Use Case | CLI Usage | Standup Mode | Document Gen | Typical Price |
|----------|-----------|--------------|--------------|---------------|
| Developer | Heavy | Yes | Monthly | Free (own LLM) |
| Manager | Light | No | Monthly | $4.99/mo |
| Freelancer | Heavy | Varies | Per-client | Free or $4.99 |
| Transitioner | Historical | No | Resume prep | Free |
| Remote | Daily | Yes | Weekly | Free (own LLM) |
| Enterprise | Heavy | Yes | Quarterly | Self-hosted |

**Bottom CTA**: "Find your workflow" → Link to /how-it-works

---

### 9. FAQ Page (`/faq`)

**Title**: Frequently Asked Questions

**Categories**:

#### Getting Started
- How do I install BragDoc?
- Do I need the CLI or can I use just the web app?
- Which LLM should I use?
- How long does setup take?
- Can I try it before committing?

#### Privacy & Security
- Does BragDoc see my code?
- Where is my data stored?
- Can I self-host?
- What data is sent to LLM providers?
- How do I run 100% offline?
- Is it safe for proprietary code?

#### Features & Usage
- How does achievement extraction work?
- What git repositories are supported?
- Can I use this with private repos?
- How accurate is the AI extraction?
- Can I edit extracted achievements?
- Does it work with monorepos?
- How many projects can I track?

#### Pricing & Billing
- What's actually free?
- What do I pay for?
- How much does LLM usage cost?
- Can I switch between free and paid?
- What payment methods do you accept?
- Can I get a refund?
- Is there enterprise pricing?

#### CLI Specific
- Which operating systems are supported?
- How do I update the CLI?
- Where are logs stored?
- How do I troubleshoot extraction?
- Can I run extraction manually?
- How does caching work?
- How do I change my schedule?

#### Technical
- What version of Node.js do I need?
- Does it work with GitHub Enterprise?
- Can I use with GitLab/Bitbucket?
- How does the CLI authenticate?
- Can I use multiple devices?
- How do I migrate between instances?

#### Comparisons
- How is this different from a TODO app?
- How is this different from journaling?
- Why not just keep notes in Notion?
- Compared to LinkedIn Endorsements?
- Compared to performance review tools?

**Each question includes**:
- Clear, concise answer
- Links to relevant documentation
- Code examples where applicable

**Bottom CTA**: "Still have questions?" → Contact form or email

---

### 10. Get Started / Quick Start Page (`/get-started`)

**Title**: Get Started with BragDoc in 5 Minutes

**Choose Your Path**:

#### Path A: CLI + Local AI (Recommended for Developers)
**Best for**: Privacy, cost control, automation

**Steps**:
1. **Install CLI** (1 minute)
   ```bash
   npm install -g @bragdoc/cli
   bragdoc --version
   ```

2. **Authenticate** (1 minute)
   ```bash
   bragdoc login
   # Opens browser, redirects back to CLI
   ```

3. **Configure LLM** (2 minutes)
   ```bash
   bragdoc llm set
   # Choose provider (recommend Ollama for free/local)
   # Enter API key (if cloud provider)
   ```

4. **Initialize First Project** (1 minute)
   ```bash
   cd ~/projects/my-app
   bragdoc init
   # Confirm automatic extraction schedule
   ```

5. **Extract Achievements**
   ```bash
   bragdoc extract
   # See achievements extracted in terminal
   # Check web app: app.bragdoc.ai/achievements
   ```

**Screenshot Requirements**:
```
@agent-web-app-tester instructions:
Terminal screenshots showing each step with successful output
Combine into step-by-step visual guide
```

#### Path B: Web-Only Start (For Non-CLI Users)
**Best for**: Trying BragDoc, non-developers, manual entry

**Steps**:
1. **Sign Up** (1 minute)
   - Visit app.bragdoc.ai/register
   - Choose Google/GitHub/Email
   - Confirm email (if email signup)

2. **Create Company** (30 seconds)
   - Click "Add Company"
   - Enter company name, employment dates
   - Save

3. **Create Project** (30 seconds)
   - Click "Add Project"
   - Enter project name, link to company
   - Choose color, save

4. **Add First Achievement** (1 minute)
   - Click "Add Achievement"
   - Enter title, description
   - Rate impact (1-10 stars)
   - Link to project, save

5. **Explore**
   - Browse achievements
   - Generate first document
   - Explore analytics

**Screenshot Requirements**:
```
@agent-web-app-tester instructions:
1. Registration page screenshot
2. Add Company form screenshot
3. Add Project form screenshot
4. Add Achievement form screenshot
5. Achievement list with first achievement
6. Document generation interface
Take all screenshots showing empty→filled progression
```

#### Path C: Hybrid Approach (Best of Both)
**Best for**: Long-term users, maximum value

**Steps**:
1. Start with Path B (web-only) to understand the app
2. After 1 week, install CLI (Path A steps 1-4)
3. Set up automatic extraction
4. Use web app for organization and reports
5. CLI handles data collection automatically

**Next Steps Section**:
- Set up standup mode
- Configure automatic extraction schedule
- Invite team members (coming soon)
- Explore document templates
- Export your data

**Troubleshooting Quick Links**:
- CLI installation issues → Link to CLI docs
- Authentication problems → Link to auth troubleshooting
- LLM configuration help → Link to LLM provider guides

**Bottom CTA**: "Need help?" → Link to FAQ or support

---

### 11. Documentation / Docs Hub (`/docs`)

**Title**: BragDoc Documentation

**Structure**: Landing page with links to detailed docs

**Sections**:

#### Quick Start Guides
- 5-Minute Quick Start (link to /get-started)
- CLI Installation Guide
- LLM Provider Setup
- First Achievement Extraction

#### Core Concepts
- What is an Achievement?
- Projects and Companies
- Impact Rating System
- Standup Mode Explained
- Document Generation

#### CLI Documentation
- Complete CLI reference (link to /cli)
- Authentication
- Project management
- Extraction options
- Scheduling and automation
- Configuration reference

#### Web App Guide
- Dashboard overview
- Achievement management
- Project organization
- Company tracking
- Document generation
- Data export/import

#### Advanced Topics
- Self-Hosting Guide
- Enterprise Deployment
- Ollama Local Setup
- Custom LLM Endpoints
- Multi-Repository Workflows
- Security Best Practices

#### Integration Guides
- GitHub Integration
- Slack Integration (coming soon)
- Email Integration
- API Documentation (coming soon)

#### Troubleshooting
- Common Issues
- CLI Errors
- Authentication Problems
- Extraction Issues
- LLM Configuration

**Each section** links to a dedicated documentation page (can be added incrementally)

---

### Supporting Pages

#### `/privacy-policy`
Legal privacy policy document (standard template)

#### `/terms-of-service`
Legal terms of service document (standard template)

#### `/contact`
Contact form or email for support/sales inquiries

#### `/changelog`
Product updates and release notes (blog-style)

#### `/blog` (Optional)
- Career development tips
- Using BragDoc effectively
- Privacy in tech
- Performance review strategies
- Remote work communication

---

### Screenshot Summary for @agent-web-app-tester

**Priority Screenshots Needed**:

1. **Achievements Dashboard** (light + dark)
   - Full viewport, 10+ achievements, varied impact, multiple projects

2. **Projects Page**
   - 5-6 projects, varied colors, achievement counts, company associations

3. **Generated Document**
   - Polished "For My Manager" report in reading view

4. **Dashboard Analytics**
   - Impact charts, trending data

5. **Standup Page**
   - Prepared standup notes with WIP and achievements

6. **Add Achievement Form**
   - Empty and filled states

7. **Document Generation Interface**
   - Time range selector, options

8. **Companies Page**
   - Multiple companies with project associations

9. **Data Export Interface**
   - Export options visible

10. **Settings/Profile**
    - User preferences, theme toggle

**Terminal Screenshots Needed** (not @agent-web-app-tester):
1. CLI installation
2. `bragdoc extract` output
3. `bragdoc projects list` output
4. `bragdoc llm set` interactive prompt
5. `bragdoc standup wip` output
6. Quick start terminal sequence

---

### Implementation Priority

**Phase 1** (MVP):
1. Homepage (/)
2. Features (/features)
3. Pricing (/pricing)
4. Get Started (/get-started)

**Phase 2**:
5. How It Works (/how-it-works)
6. CLI Documentation (/cli)
7. Privacy (/privacy)

**Phase 3**:
8. About (/about)
9. Use Cases (/use-cases)
10. FAQ (/faq)
11. Docs Hub (/docs)
