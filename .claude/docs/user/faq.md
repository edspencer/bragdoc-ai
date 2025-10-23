# BragDoc FAQ & Troubleshooting

Common questions and solutions for using BragDoc effectively.

## Table of Contents

1. [General Questions](#general-questions)
2. [Account & Billing](#account--billing)
3. [CLI Tool Issues](#cli-tool-issues)
4. [Achievement Extraction](#achievement-extraction)
5. [Web Application](#web-application)
6. [Integrations](#integrations)
7. [Privacy & Security](#privacy--security)
8. [Performance & Limits](#performance--limits)

## General Questions

### What is BragDoc?

BragDoc is an AI-powered platform that helps you track professional achievements and create compelling documents for performance reviews, manager updates, and career advancement. It automatically extracts achievements from Git commits, emails, and GitHub activity.

### Who should use BragDoc?

BragDoc is designed for:
- Software engineers tracking technical work
- Engineering managers documenting team and individual contributions
- Individual contributors in any role
- Consultants and contractors tracking deliverables
- Anyone who wants to remember and articulate their professional accomplishments

### How much does BragDoc cost?

BragDoc offers several plans:
- **Free**: Basic achievement tracking, limited extractions
- **Pro**: Unlimited achievements, advanced features, priority support
- **Enterprise**: Custom solutions for teams and organizations

See [bragdoc.ai/pricing](https://www.bragdoc.ai/pricing) for current pricing.

### How is BragDoc different from taking notes?

BragDoc offers:
- **Automated extraction** from Git commits
- **AI-powered analysis** to identify achievements
- **Structured organization** by projects and companies
- **Document generation** for reviews and updates
- **Searchable history** of all accomplishments
- **Impact tracking** over time

It's much more than a notepad—it's a comprehensive achievement management system.

### Do I need to use the CLI tool?

No, but it's highly recommended. The CLI tool automates achievement extraction from Git commits, saving hours of manual entry. However, you can use BragDoc entirely through the web interface if you prefer manual entry.

### Can I use BragDoc for non-technical work?

Absolutely! While BragDoc has powerful Git integration for engineers, you can manually log achievements for:
- Meetings and presentations
- Process improvements
- Mentoring and coaching
- Strategic planning
- Documentation
- Any professional accomplishment

### Is my code safe? Does BragDoc access my source code?

**Your code never leaves your machine.** The CLI tool analyzes Git repositories locally and only sends commit metadata (messages, dates, authors) to BragDoc. Your actual source code remains entirely on your computer.

## Account & Billing

### Can I try BragDoc without signing up?

Yes! Use Demo Mode:

1. Visit [bragdoc.ai/demo](https://www.bragdoc.ai/demo)
2. Click "Try Demo Mode"
3. Get instant access with pre-populated sample data
4. Explore all features without creating an account

**Note**: Demo accounts are temporary and all data is deleted when you log out.

### How do I create an account?

1. Go to [bragdoc.ai](https://www.bragdoc.ai)
2. Click "Sign Up"
3. Choose authentication method:
   - Sign up with Google
   - Sign up with GitHub
   - Sign up with email/password

See the **[Getting Started Guide](./getting-started.md)** for detailed instructions.

### I forgot my password. How do I reset it?

1. Go to the login page
2. Click "Forgot password?"
3. Enter your email address
4. Check your email for reset link
5. Follow the link and create a new password

### How do I change my email address?

1. Log in to BragDoc
2. Go to **Settings** > **Profile**
3. Update your email address
4. Verify your new email address

### How do I cancel my subscription?

1. Go to **Settings** > **Billing**
2. Click "Cancel Subscription"
3. Confirm cancellation
4. You'll be downgraded to the free plan at the end of your billing period

Your data remains accessible on the free plan (with usage limits).

### How do I delete my account?

1. Go to **Settings** > **Data & Privacy**
2. Click "Delete Account"
3. Confirm with your password
4. All data is permanently deleted

**Warning**: This action cannot be undone. Consider exporting your data first.

### Can I export my data?

Yes! Go to **Settings** > **Data & Privacy** > **Export Data**. You'll receive a download link with all your achievements, projects, companies, and documents in JSON format.

## CLI Tool Issues

### How do I install the CLI tool?

```bash
npm install -g @bragdoc/cli
```

See the **[CLI Guide](./cli-guide.md)** for complete installation instructions.

### "bragdoc: command not found"

**Possible causes:**
1. CLI not installed globally
2. npm global bin directory not in PATH

**Solutions:**

**Verify installation:**
```bash
npm list -g @bragdoc/cli
```

**Reinstall globally:**
```bash
npm install -g @bragdoc/cli
```

**Check npm global path:**
```bash
npm config get prefix
```

**Add to PATH (macOS/Linux):**
```bash
export PATH="$(npm config get prefix)/bin:$PATH"
```

Add to `~/.bashrc` or `~/.zshrc` to make permanent.

### "Not a git repository"

**Problem**: You're not in a Git repository directory.

**Solution**: Navigate to a Git repository:
```bash
cd /path/to/your/git/repository
bragdoc extract
```

Or specify the repository path:
```bash
bragdoc extract --repo-path /path/to/repository
```

### "Authentication required" or "Token expired"

**Problem**: You're not logged in or your authentication token expired.

**Solution**: Log in again:
```bash
bragdoc login
```

This opens your browser for authentication and saves a new token.

### CLI login opens browser but nothing happens

**Possible causes:**
1. Browser popup blocker
2. Local server port (5556) already in use
3. Network firewall blocking connection

**Solutions:**

1. **Check for popup blockers**: Allow popups from bragdoc.ai
2. **Try a different port**: Set environment variable
   ```bash
   BRAGDOC_CLI_PORT=5557 bragdoc login
   ```
3. **Check firewall**: Ensure localhost connections allowed
4. **Try manual token**: Contact support for alternative authentication

### "Repository not found in configuration"

**Problem**: Current directory's repository hasn't been added to CLI.

**Solution**: Add the repository:
```bash
bragdoc repos add
```

Or list configured repositories:
```bash
bragdoc repos list
```

### No commits are being extracted

**Possible causes:**
1. All commits already cached
2. No commits in default time range (30 days)
3. Git repository has no commits

**Solutions:**

**Check cache:**
```bash
bragdoc cache list
```

**Try wider time range:**
```bash
bragdoc extract --time-range 6m
```

**Check Git history:**
```bash
git log --oneline --since="30 days ago"
```

**Clear cache and retry:**
```bash
bragdoc cache clear
bragdoc extract
```

### "API rate limit exceeded"

**Problem**: Too many API requests in short time.

**Solutions:**
1. Wait 5-10 minutes before retrying
2. Reduce batch size in configuration:
   ```bash
   bragdoc config set settings.maxCommitsPerBatch 50
   ```
3. Spread extractions over time instead of running all at once

### CLI is very slow

**Possible causes:**
1. Large repository with many commits
2. Network latency to API
3. Processing too many commits at once

**Solutions:**

**Limit commit count:**
```bash
bragdoc repos update --max-commits 300
```

**Use shorter time range:**
```bash
bragdoc extract --time-range 1m
```

**Extract from current branch only:**
```bash
bragdoc extract --branch
```

## Achievement Extraction

### No achievements appear after extraction

**Possible causes:**
1. Commit messages don't contain achievement indicators
2. AI filtering out commits as non-achievements
3. Extraction succeeded but web page not refreshed

**Solutions:**

1. **Refresh web page**: The CLI doesn't auto-refresh the browser
2. **Check commit messages**: Review what was sent
   ```bash
   git log --oneline --since="7 days ago"
   ```
3. **Review CLI output**: Look for extraction summary
4. **Try manual entry**: Add a test achievement manually to verify account

### Achievements are inaccurate or missing details

**Problem**: AI extraction doesn't capture all context.

**Solution**: Edit achievements in web interface:
1. Go to Achievements page
2. Click "Edit" on the achievement
3. Add or improve:
   - Title clarity
   - Summary
   - Details and impact
   - Dates
   - Project/company links

**Best practice**: Review and refine extracted achievements weekly.

### Same commits extracted multiple times

**Problem**: Cache not working properly or was cleared.

**Solution**: Check cache:
```bash
bragdoc cache list
```

If cache is empty, it was cleared. The CLI should prevent duplicates going forward. If you still see duplicates, contact support.

### Can I re-extract commits with improved prompts?

Yes, if BragDoc improves its extraction AI, you can re-process commits:

```bash
# Clear cache for repository
bragdoc cache clear

# Re-extract
bragdoc extract --time-range 6m
```

**Note**: This may create duplicate achievements. You'll need to clean up manually.

### How do I extract achievements from very old commits?

Use the `--full-history` flag:

```bash
bragdoc extract --full-history
```

**Warning**: This can take a long time for large repositories and may hit rate limits. Consider using specific date ranges:

```bash
bragdoc extract --time-range 2023-01-01:2023-12-31
```

## Web Application

### Page is loading slowly

**Possible causes:**
1. Large number of achievements
2. Network latency
3. Browser cache issues

**Solutions:**

**Enable pagination:**
- Go to **Settings** > **Display Preferences**
- Set "Achievements per page" to 25 or 50

**Clear browser cache:**
- Hard refresh: `Cmd/Ctrl + Shift + R`
- Clear cache in browser settings

**Try different browser:**
- Test in Chrome, Firefox, or Safari

### I can't find a specific achievement

**Use search and filters:**

1. **Search by text:**
   - Use search bar on Achievements page
   - Searches titles, summaries, and details

2. **Filter by date:**
   - Click date filter
   - Select time range

3. **Filter by project/company:**
   - Use dropdown filters
   - Narrow down to specific work

4. **Check archived:**
   - Enable "Show Archived" filter
   - Archived items hidden by default

### Document generation is not working

**Possible causes:**
1. No achievements in selected time range
2. API rate limit reached
3. Temporary service issue

**Solutions:**

**Verify achievements exist:**
- Check that you have achievements in the selected date range
- Try wider time range

**Wait and retry:**
- If rate limited, wait 5 minutes and try again

**Check service status:**
- Contact support if issue persists

### Sharing link is not working

**Possible causes:**
1. Document sharing was disabled
2. Link was revoked
3. URL copied incorrectly

**Solutions:**

**Verify sharing is enabled:**
1. Open the document
2. Check if "Share" button is available
3. Click "Share" to generate new link

**Check sharing status:**
- Look for "Shared" badge on document
- Re-share if needed

**Copy link carefully:**
- Use the "Copy link" button
- Don't manually type the URL

### Changes aren't saving

**Possible causes:**
1. Network connection lost
2. Session expired
3. Browser issue

**Solutions:**

**Check network:**
- Verify internet connection
- Try refreshing page

**Re-authenticate:**
- Log out and log back in
- Check if session expired

**Copy content:**
- Copy your changes to clipboard
- Refresh page and paste

## Integrations

### GitHub integration is not working

**Problem**: Can't connect GitHub or repositories aren't syncing.

**Solutions:**

**Reconnect GitHub:**
1. Go to **Settings** > **Integrations**
2. Click "Disconnect GitHub"
3. Click "Connect GitHub" again
4. Re-authorize BragDoc

**Grant repository access:**
- Ensure BragDoc has permission to access repositories
- Check GitHub > Settings > Applications > BragDoc
- Grant access to desired repositories

**Manual sync:**
1. Go to **Settings** > **GitHub Repositories**
2. Click "Sync" next to each repository

### Email integration is not capturing achievements

**Problem**: Emails sent to BragDoc aren't creating achievements.

**Possible causes:**
1. Email sent from unverified address
2. Email format not recognized
3. Content doesn't indicate achievement

**Solutions:**

**Verify sender:**
- Send from the email address associated with your account
- Check Settings > Email Integration for your BragDoc email address

**Use clear format:**
```
To: your-unique-address@bragdoc.ai
Subject: Completed project milestone

Clear description of what you accomplished,
including impact and outcomes.
```

**Check email:**
- Look for confirmation email from BragDoc
- Check spam/junk folder

**Manual fallback:**
- If email doesn't work, add achievement manually in web interface

### Can I integrate with Slack or other tools?

Not yet, but integrations with Slack, Jira, and other tools are planned. Contact support to express interest and get updates on roadmap.

## Privacy & Security

### Is my data private?

Yes. Your achievements, documents, and all personal data are:
- Stored securely with encryption
- Accessible only by you
- Not shared with third parties
- Not used for marketing or advertising

See our [Privacy Policy](https://www.bragdoc.ai/privacy) for details.

### Who can see my achievements?

**By default: Only you.**

Achievements are visible to others only if:
1. You explicitly share a document containing them
2. You're on an Enterprise plan with team features enabled

Shared documents use anonymous links and can be revoked anytime.

### Can my employer see my BragDoc data?

**No, unless you explicitly share it.**

BragDoc is a personal tool. Your employer has no access to your account, achievements, or documents unless you share specific documents with them via share links.

### How do I revoke access to shared documents?

1. Go to **Documents**
2. Find the shared document
3. Click "Unshare"
4. The share link immediately becomes invalid

### What happens to my data if I cancel my subscription?

Your data remains accessible on the free plan (with usage limits). If you delete your account, all data is permanently deleted within 30 days.

### Can I self-host BragDoc?

Self-hosting is planned for the future. Contact support@bragdoc.ai to express interest and get updates.

## Performance & Limits

### What are the free plan limits?

Free plan includes:
- Up to 100 achievements
- Up to 10 documents
- 1 CLI extraction per day
- Basic support

Upgrade to Pro for unlimited usage.

### How many achievements can I track?

**Free**: 100 achievements
**Pro**: Unlimited achievements
**Enterprise**: Custom limits

### How many repositories can I connect?

No hard limit on number of repositories. However:
- Consider disabling rarely-used repositories
- Large numbers of repositories may slow extraction
- Rate limits apply to API calls

### Can I use BragDoc for multiple companies?

Yes! BragDoc is designed to track achievements across your entire career:
- Add multiple companies
- Link achievements to appropriate companies
- Filter and generate documents per company
- Track career progression over time

### How far back can I extract Git history?

You can extract your entire Git history using:

```bash
bragdoc extract --full-history
```

However:
- Large extractions may take time
- API rate limits apply
- Consider extracting in date ranges for very old repositories

### Is there a limit on document size?

Documents can include any number of achievements. However:
- Very large documents may load slowly
- Consider breaking into multiple documents
- Focus on most relevant achievements for each document

## Still Need Help?

### Contact Support

- **Email**: hello@bragdoc.ai
- **Response time**: Usually within 24 hours
- **Include in your request**:
  - Description of the issue
  - Steps to reproduce
  - CLI version (if applicable): `bragdoc --version`
  - Screenshots (if helpful)

### Documentation

- **[Getting Started Guide](./getting-started.md)** - Setup and basics
- **[CLI Guide](./cli-guide.md)** - Complete CLI documentation
- **[Web Features](./web-features.md)** - All web application features
- **[Workflows Guide](./workflows.md)** - Best practices and patterns

### Community

- **GitHub**: Report issues and feature requests
- **Twitter/X**: Follow @bragdoc for updates
- **Blog**: Read tutorials and use cases at bragdoc.ai/blog

## Common Error Messages

### "Invalid token" or "Unauthorized"

**Solution**: Re-authenticate
```bash
bragdoc login
```

### "Repository not found"

**Solution**: Add repository
```bash
bragdoc repos add
```

### "Network error" or "Connection timeout"

**Solution**: Check internet connection and retry

### "Maximum achievements reached"

**Solution**: Upgrade to Pro or archive old achievements

### "Document generation failed"

**Solution**: Check that you have achievements in the selected time range and retry

---

**Can't find your question?** Contact support at hello@bragdoc.ai or check our detailed guides:
- **[Getting Started](./getting-started.md)**
- **[CLI Guide](./cli-guide.md)**
- **[Web Features](./web-features.md)**
- **[Workflows](./workflows.md)**
