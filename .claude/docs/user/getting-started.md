# Getting Started with BragDoc

This guide will walk you through setting up BragDoc and tracking your first achievements.

## Table of Contents

1. [Creating Your Account](#creating-your-account)
2. [Understanding the Dashboard](#understanding-the-dashboard)
3. [Your First Achievement](#your-first-achievement)
4. [Setting Up the CLI Tool](#setting-up-the-cli-tool)
5. [Next Steps](#next-steps)

## Creating Your Account

### Try Demo Mode First

Want to explore BragDoc before creating an account? Try our demo mode:

1. **Visit the Demo Page**
   - Go to [bragdoc.ai/demo](https://www.bragdoc.ai/demo)
   - Click "Try Demo Mode"

2. **Instant Access**
   - Get a temporary demo account with pre-populated sample data
   - Explore all features: achievements, projects, documents
   - No signup required, no email needed

3. **Demo Account Details**
   - Anonymous email address (demo*****@bragdoc.ai)
   - Sample achievements, projects, and documents included
   - Full access to all BragDoc features
   - **Important**: All demo data is automatically deleted when you log out

Demo mode is perfect for:
- Exploring the interface and features
- Understanding BragDoc's value before committing
- Testing workflows and document generation
- Seeing how achievements are organized

**Note**: Demo mode may not be available on all deployments (e.g., self-hosted instances).

### Sign Up Options

BragDoc offers three ways to create a permanent account:

#### 1. Sign Up with Google
- Click "Sign in with Google" on the homepage
- Select your Google account
- Grant BragDoc permission to access your profile
- You're logged in and ready to go!

#### 2. Sign Up with GitHub
- Click "Sign in with GitHub" on the homepage
- Authorize BragDoc to access your GitHub profile
- Optionally grant repository access for automatic syncing
- Start tracking achievements!

#### 3. Sign Up with Email
- Click "Sign up" on the homepage
- Enter your email address and create a password
- Click "Create account"
- Check your email for verification (if required)
- Log in with your credentials

### Account Security

- **Strong Passwords**: If using email/password, choose a strong, unique password
- **Two-Factor Authentication**: We recommend enabling 2FA on your Google or GitHub account
- **Session Management**: You'll stay logged in on your browser for convenience

## Understanding the Dashboard

When you first log in, you'll see the BragDoc dashboard. Let's explore what you'll see:

### New User Experience

If you haven't tracked any achievements yet, you'll see a welcoming **zero state** with:

- **Welcome Message**: A friendly introduction to BragDoc
- **Setup Instructions**: Clear steps to get started with the CLI tool
- **Quick Action Button**: "Check for achievements" button to refresh and see if you've added any

This zero state helps you understand how to get the most value from BragDoc right away.

### Dashboard with Achievements

Once you have achievements tracked, the dashboard displays:

#### Achievement Statistics
- **Total Achievements**: Count of all your tracked achievements
- **Recent Activity**: Achievements added this week/month
- **Growth Metrics**: Trends showing your tracking progress

#### Quick Actions
- **Add Achievement**: Manually log a new achievement
- **View All Achievements**: See your complete achievement list
- **Create Document**: Generate a report from your achievements

#### Navigation
The left sidebar provides access to:
- **Dashboard**: Overview and statistics (home page)
- **Achievements**: Full list with search and filters
- **Projects**: Manage your projects
- **Companies**: Track companies you've worked for
- **Documents**: Generated reports and documents
- **Account**: Account preferences, data export/import, and account deletion

## Your First Achievement

Let's track your first achievement manually to get familiar with the interface.

### Manual Entry

1. **Navigate to Achievements**
   - Click "Achievements" in the left sidebar
   - Or click "Add Achievement" from the dashboard

2. **Click "Add Achievement"**
   - Look for the button in the top-right corner

3. **Fill in the Details**

   **Required Fields:**
   - **Title**: A clear, concise description (e.g., "Implemented user authentication")
   - **Event Duration**: How long it took (day, week, month, quarter, half year, year)

   **Optional Fields:**
   - **Summary**: A brief overview of what you accomplished
   - **Details**: More in-depth information about the achievement
   - **Event Start Date**: When you started or completed this work
   - **Event End Date**: When multi-day work was completed
   - **Company**: Select from your companies (add one if needed)
   - **Project**: Select from your projects (add one if needed)

4. **Save Your Achievement**
   - Click "Create Achievement"
   - You'll see a confirmation message
   - Your achievement appears in the list

### Example Achievement

Here's an example of a well-documented achievement:

**Title**: Reduced API response time by 60%

**Summary**: Optimized database queries and implemented caching layer for the user API endpoints

**Details**:
- Analyzed slow queries using pg_stat_statements
- Rewrote N+1 queries to use proper joins
- Implemented Redis caching for frequently accessed data
- Added monitoring to track performance improvements
- Response time improved from 500ms to 200ms average

**Event Start**: October 1, 2024
**Event Duration**: Week
**Company**: Acme Corp
**Project**: Platform Performance

## Setting Up the CLI Tool

The CLI tool is the most powerful way to use BragDoc, automatically extracting achievements from your Git commits.

### Installation

Install the CLI tool globally using npm:

```bash
npm install -g @bragdoc/cli
```

Or if you prefer pnpm:

```bash
pnpm add -g @bragdoc/cli
```

Verify the installation:

```bash
bragdoc --version
```

### Authentication

Connect the CLI to your BragDoc account:

```bash
bragdoc login
```

This will:
1. Open your default web browser
2. Take you to the BragDoc authentication page
3. Ask you to confirm CLI access
4. Automatically save your authentication token
5. Show a success message in your terminal

You only need to do this once. The authentication token is stored securely in `~/.bragdoc/config.yml`.

### Add Your First Repository

Navigate to a Git repository and add it to BragDoc:

```bash
cd /path/to/your/project
bragdoc repos add
```

This will:
- Detect the repository name
- Prompt you for a friendly name (optional)
- Ask for the maximum number of commits to track (default: 300)
- Save the repository to your configuration
- Show confirmation

You can also add a repository with a specific name:

```bash
bragdoc repos add --name "My Awesome Project" --max-commits 500
```

### Extract Achievements

Now extract achievements from your commits:

```bash
bragdoc extract
```

This will:
1. Scan your Git commit history (last 30 days by default)
2. Send commit messages to BragDoc for AI analysis
3. Extract achievements automatically
4. Cache processed commits to avoid duplicates
5. Show progress and a summary

**Pro Tip**: The first extraction might find many achievements. Subsequent runs will only process new commits.

### Verify in the Web Dashboard

1. Go back to the BragDoc web interface
2. Click "Check for achievements" (if you see the zero state)
3. Or navigate to the Achievements page
4. You should see achievements extracted from your commits!

## Next Steps

Now that you're set up, here's what to explore next:

### Organize Your Work

1. **Add Companies**
   - Navigate to "Companies" in the sidebar
   - Click "Add Company"
   - Enter company details (name, dates you worked there)
   - Save

2. **Create Projects**
   - Navigate to "Projects" in the sidebar
   - Click "Add Project"
   - Link to a company
   - Add project details
   - Save

3. **Link Achievements**
   - Go back to your achievements
   - Edit each achievement
   - Select the appropriate company and project
   - This makes filtering and reporting much easier!

### Explore CLI Features

The CLI tool has many powerful features:

```bash
# Extract from all repositories
bragdoc extract all

# List configured repositories
bragdoc repos list

# View CLI configuration
bragdoc config view

# Clear the commit cache (re-process all commits)
bragdoc cache clear

# Get help
bragdoc --help
```

See the **[CLI Guide](./cli-guide.md)** for comprehensive documentation.

### Create Your First Document

Once you have a few achievements tracked:

1. Navigate to "Documents" in the sidebar
2. Click "Generate Document"
3. Select a time range
4. Choose achievements to include
5. Select document type (performance review, weekly update, etc.)
6. Generate and review
7. Share via link or copy to clipboard

### Learn Best Practices

Read the **[Workflows Guide](./workflows.md)** to learn:
- Daily and weekly tracking patterns
- Preparing for performance reviews
- Creating effective manager updates
- Organizing achievements for maximum impact

## Getting Help

If you run into issues:

1. Check the **[FAQ & Troubleshooting](./faq.md)** guide
2. Review the **[CLI Guide](./cli-guide.md)** for CLI-specific help
3. Explore the **[Web Features](./web-features.md)** documentation
4. Contact support at hello@bragdoc.ai

## Quick Reference Card

### Essential CLI Commands

```bash
# Authentication
bragdoc login                    # Authenticate CLI
bragdoc logout                   # Sign out
bragdoc auth status              # Check auth status

# Repository Management
bragdoc repos add                # Add current repository
bragdoc repos list               # List all repositories
bragdoc repos remove             # Remove repository

# Extraction
bragdoc extract                  # Extract from current repo
bragdoc extract all              # Extract from all repos

# Cache Management
bragdoc cache list               # View cached commits
bragdoc cache clear              # Clear cache
```

### Web Interface Quick Actions

- **Add Achievement**: Click "Add Achievement" from any page
- **Search**: Use the search bar on the Achievements page
- **Filter**: Click filter icons to narrow down your list
- **Generate Document**: Navigate to Documents > Generate
- **Account**: Access via the Account link in the sidebar

---

**You're ready to go!** Start tracking your achievements and never forget your accomplishments again.

**Next**: Explore **[Web Features](./web-features.md)** or dive into the **[CLI Guide](./cli-guide.md)** for advanced usage.
