# BragDoc Web Features

This guide covers all features available in the BragDoc web application. Access the web app at [bragdoc.ai](https://www.bragdoc.ai).

## Table of Contents

1. [Dashboard](#dashboard)
2. [Achievement Management](#achievement-management)
3. [Project Management](#project-management)
4. [Company Management](#company-management)
5. [Document Management](#document-management)
6. [Standup / Daily Updates](#standup--daily-updates)
7. [Workstreams (Coming Soon)](#workstreams-coming-soon)
8. [GitHub Integration](#github-integration)
9. [Email Integration](#email-integration)
10. [Settings & Preferences](#settings--preferences)
11. [Account Management](#account-management)

## Dashboard

The Dashboard is your home page in BragDoc, providing an overview of your achievement tracking activity.

### Zero State (New Users)

When you first sign up and haven't tracked any achievements yet, you'll see a welcoming zero state that includes:

- **Welcome Message**: Introduction to BragDoc and its purpose
- **Getting Started Steps**: Clear instructions for:
  1. Installing the CLI tool
  2. Authenticating with `bragdoc login`
  3. Adding a repository with `bragdoc repos add`
  4. Extracting achievements with `bragdoc extract`
- **Check for Achievements Button**: Refreshes the page to see if you've added achievements

This zero state helps you get started quickly and understand the most powerful way to use BragDoc.

### Dashboard with Achievements

Once you have achievements tracked, the dashboard displays:

#### Achievement Statistics

- **Total Achievements**: Count of all tracked achievements
- **Recent Activity**: Achievements added this week/month
- **Growth Trends**: Charts showing your tracking progress over time

#### Quick Actions

- **Add Achievement**: Button to manually log a new achievement
- **View All**: Link to your complete achievement list
- **Generate Document**: Quick access to document creation

#### Recent Achievements

- List of your most recently added achievements
- Quick preview of titles and dates
- Links to view or edit each achievement

#### Activity Feed

- Timeline of recent activity
- Achievements added via CLI, email, or manual entry
- Updates to projects and companies

## Achievement Management

The Achievements page is where you view, search, filter, and manage all your tracked achievements.

### Achievement List View

The main achievements page displays all your achievements in a sortable, filterable table:

#### Table Columns

- **Title**: The main description of the achievement
- **Summary**: Brief overview (if provided)
- **Date**: When the achievement occurred (event start date)
- **Duration**: How long the achievement took (day, week, month, quarter, etc.)
- **Company**: Associated company (if linked)
- **Project**: Associated project (if linked)
- **Actions**: Edit and delete buttons

#### Sorting

Click any column header to sort:

- Title (alphabetical)
- Date (chronological)
- Duration (shortest to longest)
- Company (alphabetical)
- Project (alphabetical)

### Search & Filters

#### Search

- **Text Search**: Search across titles, summaries, and details
- **Real-time Results**: Updates as you type
- **Clear Button**: Quickly reset search

#### Filters

- **Date Range**: Filter by event start/end dates
  - Last week, last month, last quarter, last year
  - Custom date range
- **Company**: Show only achievements for specific companies
- **Project**: Show only achievements for specific projects
- **Duration**: Filter by how long achievements took
- **Archived Status**: Include or exclude archived achievements

#### Filter Combinations

Combine multiple filters to narrow results:

- Example: "Show all achievements for Company XYZ in Q4 2024"
- Example: "Show week-long achievements in the Backend API project"

### Creating Achievements

#### Manual Entry

1. Click **"Add Achievement"** button
2. Fill in the achievement form:

   **Required Fields:**
   - **Title**: Clear, concise description (max 256 characters)
   - **Event Duration**: Select from dropdown
     - Day: Completed in a single day
     - Week: Took approximately a week
     - Month: Spanned about a month
     - Quarter: Lasted roughly 3 months
     - Half Year: Took around 6 months
     - Year: Spanned a full year or longer

   **Optional Fields:**
   - **Summary**: Brief overview of the achievement
   - **Details**: In-depth information, context, and impact
   - **Event Start Date**: When you started or completed this work
   - **Event End Date**: Completion date for multi-day work
   - **Company**: Link to a company from your list
   - **Project**: Link to a project from your list

3. Click **"Create Achievement"**
4. Achievement appears in your list immediately

#### From CLI

Achievements are automatically created when you run `bragdoc extract`. See the **[CLI Guide](./cli-guide.md)** for details.

#### From Email

Forward emails to your BragDoc email address to automatically extract achievements. See **[Email Integration](#email-integration)** for details.

### Editing Achievements

1. Find the achievement in your list
2. Click the **"Edit"** button
3. Modify any fields in the form
4. Click **"Save Changes"**

**Tips:**

- Add more details after initial extraction
- Link to companies and projects for better organization
- Update dates if the initial extraction was incorrect
- Add impact metrics and outcomes in the details field

### Deleting Achievements

1. Find the achievement in your list
2. Click the **"Delete"** button
3. Confirm deletion in the dialog

**Warning**: Deletion is permanent and cannot be undone.

### Archiving Achievements

Archive achievements you want to keep but hide from active views:

1. Edit the achievement
2. Toggle the "Archived" checkbox
3. Save changes

**Archived achievements:**

- Hidden from default views
- Can be shown by enabling "Show Archived" filter
- Still included in date-filtered reports if within range
- Not deleted; can be unarchived anytime

## Project Management

Projects help you organize achievements by the specific initiatives or work streams they relate to.

### Projects List View

Navigate to **Projects** in the sidebar to see:

- All your projects in a table
- Project name, company association, and dates
- Start and end dates for each project
- Number of achievements linked to each project
- Edit and delete actions

### Creating Projects

1. Click **"Add Project"** button
2. Fill in project details:
   - **Name**: Project name (required)
   - **Description**: Brief description of the project (optional)
   - **Company**: Link to a company (optional but recommended)
   - **Start Date**: When the project began (optional)
   - **End Date**: When the project ended (optional, leave blank for ongoing)
   - **Status**: Active, Completed, or Archived

3. Click **"Create Project"**
4. Celebration animation on success!

### Editing Projects

1. Click **"Edit"** next to a project
2. Modify project details
3. Click **"Save Changes"**

### Deleting Projects

1. Click **"Delete"** next to a project
2. Confirm deletion

**Note**: Deleting a project doesn't delete associated achievements. They simply lose the project link.

### Project-Achievement Linking

Link achievements to projects in two ways:

1. **From Achievement Form**: Select project when creating/editing achievement
2. **Bulk Actions**: Select multiple achievements and assign to project (coming soon)

### Project Views

- **All Projects**: See all projects across all companies
- **Filtered by Company**: View projects for a specific company
- **Active Projects**: Filter to show only active (non-archived) projects
- **Completed Projects**: Show finished projects

## Company Management

Companies help you organize achievements by employer or client.

### Companies List View

Navigate to **Companies** in the sidebar to see:

- All your companies in a table
- Company name and date range
- Number of associated projects and achievements
- Edit and delete actions

### Creating Companies

1. Click **"Add Company"** button
2. Fill in company details:
   - **Name**: Company name (required)
   - **Description**: Brief description (optional)
   - **Start Date**: When you started working there (optional)
   - **End Date**: When you stopped working there (optional, leave blank for current)

3. Click **"Create Company"**
4. Celebration animation on success!

### Editing Companies

1. Click **"Edit"** next to a company
2. Modify company details
3. Click **"Save Changes"**

### Deleting Companies

1. Click **"Delete"** next to a company
2. Confirm deletion

**Note**: Deleting a company doesn't delete associated projects or achievements. They simply lose the company link.

### Company Hierarchy

BragDoc organizes your work hierarchically:

```
Company
└── Projects
    └── Achievements
```

This structure helps you:

- See all work for a specific employer
- Filter achievements by company
- Generate company-specific reports
- Track career progression

## Document Management

Documents are generated reports and updates created from your achievements.

### Documents List View

Navigate to **Documents** in the sidebar to see:

- All your generated documents
- Document title, type, and creation date
- Company association (if applicable)
- Share status (private or shared)
- Actions: view, edit, share, delete

### Document Types

BragDoc supports several document types:

- **Performance Review**: Comprehensive review document for annual/semi-annual reviews
- **Weekly Report**: Summary of the week's achievements (also called "Weekly Update")
- **Monthly Report**: Summary of the month's achievements
- **Manager Update**: Status update for your manager
- **Project Summary**: Overview of achievements for a specific project
- **Custom**: Free-form document you create

Each document type can be linked to a specific company for better organization and filtering.

### Generating Documents

1. Navigate to **Documents**
2. Click **"Generate Document"**
3. Select document parameters:
   - **Type**: Choose document type
   - **Time Range**: Select date range
   - **Achievements**: Choose which achievements to include
     - All in date range (default)
     - Specific projects
     - Specific companies
     - Manual selection
   - **Company**: Optionally link to a company

4. Click **"Generate"**
5. AI processes your achievements and creates the document
6. Review and edit the generated content

### Editing Documents

Documents support rich text editing:

- **Formatting**: Bold, italic, underline, headings
- **Lists**: Bulleted and numbered lists
- **Links**: Add hyperlinks
- **Structure**: Organize with sections and paragraphs

To edit a document:

1. Click **"Edit"** on the document
2. Use the rich text editor to modify content
3. Click **"Save"** when done

### Sharing Documents

Share documents securely without requiring recipients to sign up:

1. Open the document
2. Click **"Share"** button
3. Copy the generated share link
4. Share link via email, Slack, etc.

**Shared documents:**

- Have a unique, anonymous URL
- Are read-only for recipients
- Include the document title and content
- Can be viewed by anyone with the link
- Can be unshared at any time

### Unsharing Documents

Revoke access to a shared document:

1. Open the document
2. Click **"Unshare"** button
3. Confirm revocation

The share link immediately becomes invalid.

### Deleting Documents

1. Click **"Delete"** next to a document
2. Confirm deletion

**Note**: This doesn't delete the achievements used to create the document.

### Exporting Documents

Export documents in multiple formats:

- **Copy to Clipboard**: Quick copy for pasting elsewhere
- **Print**: Print or save as PDF (coming soon)
- **Export to Word**: Download as .docx (coming soon)
- **Export to Markdown**: Download as .md (coming soon)

## Standup / Daily Updates

The Standup feature helps you prepare for daily standup meetings and maintain ongoing documentation of your daily work.

### What is the Standup Feature?

Standup is a dedicated space for capturing and tracking your daily updates. It's perfect for:

- Preparing for daily standup meetings
- Documenting what you're working on
- Tracking blockers and challenges
- Maintaining a running log of daily progress

### Zero State (New Users)

If you haven't created a standup yet, you'll see a welcoming zero state that:

- Explains the purpose of the standup feature
- Provides guidance on how to get started
- Offers a button to create your first standup

### Using Standup

Navigate to **Standup** in the sidebar to access your daily update workspace:

1. **Create Your Standup**
   - Click the button to create your first standup
   - Set up your preferred format

2. **Daily Updates**
   - Document what you completed today
   - Note what you're working on
   - List any blockers or help needed
   - Record important decisions or discussions

3. **Meeting Preparation**
   - Review your standup before daily meetings
   - Have concrete examples ready to share
   - Track follow-up items from previous standups

4. **Connection to Achievements**
   - Standup entries can help you remember achievements
   - Use standup notes when creating formal achievement entries
   - Reference standup history during performance reviews

### Standup Best Practices

**Update Regularly:**

- Fill in your standup at the end of each day
- Or prepare it right before your daily standup meeting
- Keep entries concise and focused

**Be Specific:**

- Mention specific features, bugs, or tasks
- Include relevant ticket numbers or PR links
- Note any significant decisions made

**Track Progress:**

- Review previous standup entries to see patterns
- Identify recurring blockers
- Celebrate wins and completed work

## Workstreams (Coming Soon)

Workstreams is an upcoming feature that will automatically organize your achievements into thematic groups using AI-powered semantic analysis.

### What are Workstreams?

Workstreams will be automatically-generated collections of semantically related achievements that may span multiple projects. Unlike projects (which are organizational units you define), workstreams represent thematic work patterns discovered through machine learning.

**Example Workstreams:**

- "API Performance Optimization" - achievements from multiple projects focused on backend performance
- "User Authentication & Security" - authentication work across frontend, backend, and mobile projects
- "Design System Implementation" - UI component work spanning multiple product areas
- "Data Pipeline Reliability" - infrastructure achievements across various services

### Key Benefits (When Available)

1. **Pattern Discovery**: Automatically discover themes in your work that aren't obvious from project structure
2. **Cross-Project Insights**: See how similar work appears across different projects
3. **Portfolio Building**: Group related achievements for resumes, reviews, or presentations
4. **Time Analysis**: Understand how your time is distributed across different types of work
5. **Career Insights**: Identify areas of specialization or growth opportunities

### Requirements

To use workstreams (when available):

- You'll need at least **20 achievements** for initial generation
- The AI will analyze your achievement descriptions, titles, and details
- Workstreams will update automatically as you add new achievements
- You'll be able to manually adjust AI-generated groupings

### How It Will Work

1. **Automatic Generation**: Click "Generate Workstreams" to analyze your achievements
2. **AI Clustering**: Machine learning identifies semantic patterns across your work
3. **Named Groups**: AI suggests meaningful names for each workstream
4. **Manual Refinement**: Override AI assignments or rename workstreams as needed
5. **Incremental Updates**: New achievements automatically assigned to appropriate workstreams

### Status

Workstreams is fully specified and planned but not yet implemented. We're gathering user feedback to refine the feature before launch. If you're interested in workstreams, let us know at hello@bragdoc.ai.

## GitHub Integration

Connect your GitHub account to automatically sync repositories and pull requests.

### Connecting GitHub

GitHub OAuth integration is fully functional and allows you to authenticate with your GitHub account and sync repositories:

1. Navigate to **Settings** > **Integrations**
2. Click **"Connect GitHub"**
3. Authorize BragDoc to access your GitHub account
4. Grant repository access (all or selected repositories)
5. Connection confirmed!

Once connected, you can sync pull requests, contributions, and other GitHub activity into your BragDoc achievements.

### Repository Synchronization

Once connected, BragDoc can sync:

- **Repository List**: All repositories you have access to
- **Pull Requests**: PRs you've created or contributed to
- **Contributions**: Commits and code reviews
- **Metadata**: PR descriptions, labels, review comments

### Syncing Repositories

1. Navigate to **Settings** > **GitHub Repositories**
2. See list of your repositories
3. Click **"Sync"** next to a repository to update
4. Last synced timestamp updates
5. New achievements appear in your list

### Automatic Syncing

Enable automatic background syncing:

1. Go to **Settings** > **Integrations** > **GitHub**
2. Toggle **"Auto-sync repositories"**
3. Choose sync frequency:
   - Every 6 hours
   - Daily
   - Weekly

### Managing GitHub Access

- **View Connected Repositories**: See all synced repositories
- **Add/Remove Repositories**: Adjust which repositories BragDoc can access
- **Disconnect GitHub**: Revoke BragDoc's access to GitHub
  - Note: Existing achievements remain; syncing stops

## Email Integration

Send achievements directly to BragDoc via email. BragDoc has robust inbound email processing to capture achievements from your messages.

### Current Email Capabilities

**Inbound Email Processing** (Fully Implemented):

- Forward emails to BragDoc to capture achievements
- AI automatically extracts achievement information from email content
- Supports both plain text and HTML email formats
- Automatically links achievements to companies and projects (when mentioned)
- Detects dates, durations, and impact metrics from email text
- Secure webhook integration with signature verification

**Outbound Emails** (Infrastructure in Place):
The email infrastructure for sending summaries and notifications is built, but automatic outbound features are still being finalized:

- Weekly/monthly achievement summaries (coming soon)
- Performance review reminders (coming soon)
- Manager update emails (planned)

You can, however, manually generate and email documents using the document generation and sharing features.

### Your BragDoc Email Address

Each user has a unique BragDoc email address for receiving achievements:

Format: Varies by deployment, typically linked to your account

Find your email address:

1. Navigate to **Settings** > **Email Integration**
2. Your unique BragDoc email address is displayed
3. Click to copy to clipboard

### Sending Achievements via Email

Forward or compose emails to your BragDoc address:

**Email Format:**

```
To: your-unique-address@bragdoc.ai
Subject: Completed new feature rollout

Launched the new dashboard feature to all users today.
The feature includes real-time updates and improved
performance. User feedback has been overwhelmingly positive
with 95% satisfaction rate.

Impact: Reduced support tickets by 30%, improved user
engagement by 25%.
```

**What happens:**

1. BragDoc receives your email
2. AI analyzes the content
3. Extracts achievement information:
   - Title (from subject or content)
   - Summary and details
   - Dates and duration (inferred)
   - Company and project context (if mentioned)
4. Creates achievement in your account
5. Sends confirmation email (optional)

### Email Parsing

BragDoc's AI understands various email formats:

- **Plain text**: Simple paragraphs
- **HTML**: Formatted emails
- **Forwarded emails**: Extracts relevant information
- **Reply threads**: Focuses on new content

### Tips for Email Achievements

**Be Specific:**

- Include clear achievement descriptions
- Mention outcomes and impact
- Provide context and metrics

**Include Dates:**

- Reference when work was completed
- Mention project timelines
- Use phrases like "last week" or "in Q4"

**Reference Projects/Companies:**

- Mention project names
- Include company references
- BragDoc will attempt to link automatically

**Example Email:**

```
Subject: Q4 2024 Backend API Refactoring Complete

Finished the backend API refactoring project at Acme Corp.

The work started in October and wrapped up this week.
We reduced response times by 60% and improved error
handling across all endpoints.

Key improvements:
- Optimized database queries
- Implemented Redis caching
- Added comprehensive error logging
- Updated API documentation

The team is already seeing benefits with reduced support
tickets and improved developer experience.
```

### Email Preferences

Configure email settings:

1. Go to **Settings** > **Email Integration**
2. Configure:
   - **Confirmation Emails**: Get notified when achievements are extracted
   - **Email Frequency**: How often you want summary emails
   - **Email Format**: Plain text or HTML

### Unsubscribing

Unsubscribe from BragDoc emails:

- Click "Unsubscribe" link in any email
- Or manage preferences in **Settings** > **Email Integration**

## Settings & Preferences

Customize your BragDoc experience in Settings.

### Profile Settings

- **Display Name**: How your name appears
- **Email Address**: Your account email
- **Profile Picture**: Upload or use Gravatar
- **Time Zone**: For accurate date/time display

### Notification Preferences

Configure when and how you receive notifications:

- **Email Notifications**:
  - Weekly achievement summaries
  - Monthly achievement digests
  - Document generation completion
  - New features and updates

- **In-App Notifications**:
  - Real-time updates
  - Achievement extraction completion
  - Document sharing notifications

### Display Preferences

- **Theme**: Light, Dark, or System
- **Date Format**: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
- **Time Format**: 12-hour or 24-hour
- **Achievements Per Page**: 10, 25, 50, 100

### Privacy Settings

- **Profile Visibility**: Public or Private
- **Document Sharing**: Enable/disable document sharing feature
- **Data Export**: Request copy of your data
- **Account Deletion**: Permanently delete your account

### Integrations

Manage connected services:

- **GitHub**: Connect/disconnect, configure sync
- **Email**: View email address, configure parsing
- **CLI Tokens**: View active CLI sessions, revoke tokens

## Account Management

### Security

#### Password Management

- **Change Password**: Update your password
- **Password Requirements**: Minimum 8 characters, must include numbers and symbols

#### Two-Factor Authentication

- **Enable 2FA**: Add extra security to your account
- **Backup Codes**: Generate codes for account recovery
- **Authenticator Apps**: Use Google Authenticator, Authy, etc.

#### Active Sessions

- **View Sessions**: See all logged-in devices
- **Revoke Sessions**: Sign out of specific devices
- **CLI Tokens**: Manage CLI authentication tokens

### Billing & Subscription

#### Plan Information

- **Current Plan**: Free, Pro, or Enterprise
- **Usage**: Achievement count, document generations, storage
- **Billing Cycle**: Monthly or annual

#### Upgrade/Downgrade

- **Change Plans**: Upgrade or downgrade your subscription
- **Payment Method**: Update credit card information
- **Billing History**: View past invoices

#### Cancellation

- **Cancel Subscription**: Downgrade to free plan
- **Retention**: Your data remains accessible on free plan (with limits)

### Data Management

#### Export Data

Export all your data in JSON format:

1. Go to **Settings** > **Data & Privacy**
2. Click **"Export Data"**
3. Receive download link via email
4. Download ZIP file with all your data

**Included in export:**

- All achievements
- Projects and companies
- Documents
- Configuration settings

#### Delete Account

Permanently delete your account and all data:

1. Go to **Settings** > **Data & Privacy**
2. Click **"Delete Account"**
3. Confirm with password
4. All data is permanently deleted

**Warning**: This action cannot be undone.

## Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:

### Global Shortcuts

- `?` - Show keyboard shortcuts help
- `/` - Focus search bar
- `n` - Create new achievement
- `g d` - Go to dashboard
- `g a` - Go to achievements
- `g p` - Go to projects
- `g c` - Go to companies
- `g o` - Go to documents

### Achievement List

- `j` - Select next achievement
- `k` - Select previous achievement
- `Enter` - Open selected achievement
- `e` - Edit selected achievement
- `Delete` - Delete selected achievement

### Document Editor

- `Cmd/Ctrl + S` - Save document
- `Cmd/Ctrl + B` - Bold text
- `Cmd/Ctrl + I` - Italic text
- `Cmd/Ctrl + K` - Insert link

---

**Next Steps**: Learn effective usage patterns in **[Workflows & Best Practices](./workflows.md)** or troubleshoot issues in the **[FAQ](./faq.md)**.
