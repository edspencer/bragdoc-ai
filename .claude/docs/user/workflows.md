# BragDoc Workflows & Best Practices

This guide covers effective patterns for using BragDoc in your daily work, preparing for performance reviews, and maximizing the value you get from tracking your achievements.

## Table of Contents

1. [Daily & Weekly Workflows](#daily--weekly-workflows)
2. [Performance Review Preparation](#performance-review-preparation)
3. [Manager Updates](#manager-updates)
4. [Project Tracking](#project-tracking)
5. [Career Transition Planning](#career-transition-planning)
6. [Team Leadership](#team-leadership)
7. [Writing Effective Achievements](#writing-effective-achievements)
8. [Organization Strategies](#organization-strategies)

## Daily & Weekly Workflows

### The 5-Minute Friday Routine

Establish a weekly habit to review and refine your achievements:

**Every Friday at 4:00 PM:**

1. **Extract Latest Commits** (2 minutes)
   ```bash
   bragdoc extract all
   ```

2. **Review in Web Dashboard** (2 minutes)
   - Open BragDoc web interface
   - Review this week's achievements
   - Edit titles for clarity
   - Add impact descriptions

3. **Link to Projects** (1 minute)
   - Assign achievements to appropriate projects
   - Update project status if needed

**Why Friday?**
- The week is fresh in your mind
- Easy to remember what you worked on
- Sets you up well for Monday planning

### Daily Achievement Logging

For those who prefer daily tracking:

**End of Each Work Day:**

1. **Quick Reflection** (2 minutes)
   - What did I complete today?
   - What made an impact?
   - What was challenging?

2. **Log Manually or via Email** (3 minutes)
   - Option A: Add via web interface
   - Option B: Send email to your BragDoc address

   Example email:
   ```
   Subject: Fixed critical production bug

   Identified and fixed the memory leak causing
   production outages. Response time improved by
   50% and no outages since deploy.
   ```

3. **Tag and Categorize** (1 minute)
   - Link to project
   - Add company association
   - Note duration and dates

**Benefits:**
- Captures details while fresh
- Builds a comprehensive record
- Reduces end-of-week scramble

### Hybrid Approach (Recommended)

Combine automated and manual tracking:

**Weekly (Friday):**
- Run `bragdoc extract all` to capture commits
- Review and refine extracted achievements

**As Needed (2-3x per week):**
- Manually log non-code achievements:
  - Meetings with outcomes
  - Process improvements
  - Mentoring and code reviews
  - Design decisions
  - Documentation written

**Monthly:**
- Review and organize all achievements
- Ensure proper project/company links
- Archive old or irrelevant items

## Performance Review Preparation

### 6-Week Preparation Timeline

**Week 1-2: Data Collection**

1. **Run Full Extraction**
   ```bash
   bragdoc extract --time-range 1y
   ```

2. **Manual Additions**
   - Add achievements not captured by Git
   - Include meetings, presentations, mentoring
   - Document process improvements

3. **Organize by Project**
   - Ensure all achievements linked to projects
   - Verify company associations
   - Update dates if needed

**Week 3: Review and Refine**

1. **Read Through All Achievements**
   - Filter by review period dates
   - Sort by project and date

2. **Enhance Descriptions**
   - Add impact metrics where possible
   - Include outcomes and results
   - Clarify context for each achievement

3. **Identify Themes**
   - Technical growth areas
   - Leadership contributions
   - Business impact
   - Innovation and creativity

**Week 4: Document Generation**

1. **Generate Review Document**
   - Use "Performance Review" document type
   - Select full review period
   - Include all relevant achievements

2. **Structure the Document**
   Organize into sections:
   - Executive Summary
   - Key Accomplishments
   - Technical Contributions
   - Leadership & Collaboration
   - Growth & Development
   - Future Goals

3. **Add Context**
   - Explain difficult problems solved
   - Highlight business impact
   - Show growth over time
   - Connect to company goals

**Week 5-6: Polish and Prepare**

1. **Review and Edit**
   - Read document start to finish
   - Ensure clear narrative
   - Add transitions between sections
   - Check for completeness

2. **Get Feedback** (Optional)
   - Share with trusted colleague
   - Ask for perspective on impact
   - Identify missing achievements

3. **Practice Discussion**
   - Prepare to discuss each achievement
   - Have examples ready
   - Be ready to elaborate on impact

### Day of Review

**Before the Meeting:**
- Review your document one last time
- Have BragDoc open for reference
- Be ready to share specific examples

**During the Review:**
- Reference specific achievements
- Provide concrete examples
- Discuss impact and outcomes
- Take notes on feedback

**After the Review:**
- Log any achievements discussed that weren't captured
- Update goals in your projects
- Plan for next review cycle

## Manager Updates

### Weekly Status Updates

**Every Monday Morning or Friday Afternoon:**

1. **Generate Weekly Report**
   - Select "Weekly Report" document type
   - Choose last 7 days
   - Include all achievements

2. **Review and Customize**
   - Add context for your manager
   - Highlight blockers or needs
   - Connect to team goals
   - Keep it concise (1 page max)

3. **Send to Manager**
   - Copy from BragDoc
   - Paste into email or Slack
   - Or share BragDoc link directly

**Template Structure:**
```
Week of [Date]

Completed:
- [Achievement 1 with brief impact]
- [Achievement 2 with brief impact]
- [Achievement 3 with brief impact]

In Progress:
- [Current focus areas]

Blockers/Needs:
- [Any help needed]

Next Week:
- [Planned focus]
```

### Monthly Updates

For skip-level managers or monthly check-ins:

1. **Generate Monthly Report**
   - Select last 30 days
   - Group by project or theme
   - Focus on high-impact items

2. **Add Strategic Context**
   - How work connects to team goals
   - Impact on business metrics
   - Cross-team collaboration
   - Innovation and improvements

3. **Include Forward Look**
   - Upcoming projects
   - Areas of focus
   - Skill development
   - Team contributions

## Project Tracking

### Project Lifecycle Management

**Project Start:**

1. **Create Project in BragDoc**
   - Name, description, dates
   - Link to company
   - Set status to "Active"

2. **Set Up Tracking**
   - Ensure Git repository is added to CLI
   - Create project-specific labels or tags
   - Document initial goals

**During Project:**

1. **Regular Extraction**
   ```bash
   # Extract and filter by project
   bragdoc extract
   ```

2. **Link Achievements**
   - Assign all relevant achievements to project
   - Track milestone completions
   - Document key decisions

3. **Weekly Review**
   - Check project progress
   - Ensure important work is captured
   - Add manual entries for non-code work

**Project Completion:**

1. **Generate Project Summary**
   - Create custom document
   - Include all project achievements
   - Add outcomes and metrics
   - Document lessons learned

2. **Update Project Status**
   - Set status to "Completed"
   - Add end date
   - Final statistics

3. **Share Results**
   - Share summary with stakeholders
   - Use for future project pitches
   - Reference in performance reviews

### Multi-Project Tracking

When working on multiple projects simultaneously:

1. **Name Conventions**
   - Use clear, consistent naming
   - Include team or area in name
   - Example: "Platform - API v2", "Mobile - iOS Rewrite"

2. **Regular Organization**
   - Weekly: Link new achievements to projects
   - Monthly: Review project distribution
   - Quarterly: Archive completed projects

3. **Balanced Documentation**
   - Ensure all projects are represented
   - Track smaller contributions too
   - Don't lose maintenance work

## Career Transition Planning

### Building Your Portfolio

**3-6 Months Before Job Search:**

1. **Comprehensive Extraction**
   ```bash
   bragdoc extract --full-history
   ```

2. **Curate Key Achievements**
   - Identify your strongest work
   - Focus on impact and outcomes
   - Prepare examples for interviews

3. **Create Showcase Documents**
   - Generate documents by skill area
   - Create project-specific summaries
   - Prepare company-specific highlights

### Interview Preparation

**2 Weeks Before Interviews:**

1. **Review All Achievements**
   - Refresh memory on details
   - Prepare to discuss each one
   - Have metrics ready

2. **Prepare STAR Stories**
   - **S**ituation: Context and challenge
   - **T**ask: Your role and responsibility
   - **A**ction: What you did specifically
   - **R**esult: Outcome and impact

   Use BragDoc achievements as basis for each story

3. **Create Leave-Behind Document**
   - Professional summary document
   - Key achievements and impact
   - Share link with interviewers

### Resume & LinkedIn Updates

Use BragDoc to keep profiles current:

1. **Extract Recent Achievements**
   - Last 1-2 years for resume
   - Most impactful items

2. **Craft Bullet Points**
   - Action verb + achievement + impact
   - Quantify where possible
   - Be concise and specific

3. **LinkedIn Quarterly Update**
   - Add recent projects
   - Update experience descriptions
   - Refresh skills and accomplishments

## Team Leadership

### Managing Team Achievements

As a manager or tech lead:

1. **Track Your Own Work**
   - Individual contributions
   - Leadership activities
   - Strategic initiatives

2. **Document Team Achievements**
   - Create separate projects for team initiatives
   - Log team accomplishments
   - Note individual contributions

3. **Prepare Team Reviews**
   - Generate reports per team member
   - Track team-wide metrics
   - Document growth and development

### Mentoring and Development

**Track Mentoring Activities:**

1. **Log Mentoring Sessions**
   ```
   Title: Code review and architecture mentoring with Jane

   Details: Reviewed PR for new service architecture.
   Discussed microservices patterns, error handling, and
   testing strategies. Jane implemented suggestions and
   improved code quality significantly.

   Duration: Week
   ```

2. **Document Team Growth**
   - Skills developed by team members
   - Promotions supported
   - Training delivered

3. **Show Leadership Impact**
   - Team velocity improvements
   - Code quality metrics
   - Retention and satisfaction

## Writing Effective Achievements

### Achievement Anatomy

**Good Achievement Structure:**

1. **Clear Title** (What you did)
   - Action-oriented
   - Specific and concise
   - Searchable

2. **Summary** (Brief overview)
   - 1-2 sentences
   - Main accomplishment
   - Quick context

3. **Details** (Deep dive)
   - Challenge or opportunity
   - Your approach
   - Implementation details
   - Outcome and impact

4. **Metadata**
   - Accurate dates
   - Appropriate duration
   - Linked to project/company

### Examples of Great Achievements

**Example 1: Technical Improvement**

**Title**: Reduced API latency by 75% through database optimization

**Summary**: Identified and resolved N+1 query problems in the user API endpoints, reducing average response time from 800ms to 200ms.

**Details**:
Analyzed production database performance using pg_stat_statements and identified multiple N+1 query patterns in the user endpoints. Rewrote queries to use proper joins and implemented strategic eager loading. Added Redis caching for frequently accessed user data. Created monitoring dashboard to track performance improvements. Result: average API response time dropped from 800ms to 200ms, 99th percentile improved from 2s to 500ms. Customer-reported API timeout issues dropped to zero.

**Duration**: 2 weeks
**Project**: Platform Performance Initiative
**Company**: Acme Corp

---

**Example 2: Process Improvement**

**Title**: Established automated deployment pipeline reducing release time by 90%

**Summary**: Designed and implemented CI/CD pipeline using GitHub Actions, reducing deployment time from 4 hours to 25 minutes.

**Details**:
Previous deployment process was manual, error-prone, and took ~4 hours with significant team coordination. Researched options and selected GitHub Actions for CI/CD. Implemented automated testing, building, and deployment workflows. Added automatic rollback capabilities and deployment notifications. Created runbooks and trained team on new process. Result: deployment time reduced from 4 hours to 25 minutes, zero failed deployments in first 3 months, team can now deploy multiple times per day with confidence.

**Duration**: 1 month
**Project**: DevOps Modernization
**Company**: Acme Corp

---

**Example 3: Leadership Contribution**

**Title**: Led incident response for critical production outage, minimizing downtime

**Summary**: Coordinated response to database failure affecting all users, restored service in 45 minutes and prevented data loss.

**Details**:
Responded to critical alert about database failure during peak traffic. Quickly assembled incident response team, coordinated investigation, and identified corrupted index as root cause. Directed team to rebuild index while maintaining read-only mode. Communicated status to stakeholders every 15 minutes. Service restored in 45 minutes with zero data loss. Post-incident, led retrospective and implemented automated index monitoring to prevent recurrence. Created incident response playbook based on learnings.

**Duration**: 1 day (incident) + 1 week (follow-up)
**Project**: Platform Reliability
**Company**: Acme Corp

### Common Mistakes to Avoid

**Too Vague:**
- ❌ "Worked on the API"
- ✅ "Implemented rate limiting for public API endpoints"

**No Impact:**
- ❌ "Refactored database queries"
- ✅ "Refactored database queries, reducing page load time by 40%"

**Missing Context:**
- ❌ "Fixed bug"
- ✅ "Fixed authentication bug affecting 20% of users, preventing login failures"

**Too Technical Without Outcome:**
- ❌ "Implemented Redis caching with TTL-based invalidation"
- ✅ "Implemented Redis caching, reducing server load by 60% and improving response times"

## Organization Strategies

### Taxonomy Best Practices

**Company Naming:**
- Use official company name
- Include relevant dates
- Example: "Acme Corp (2020-2023)"

**Project Naming:**
- Be specific and descriptive
- Include team or area if needed
- Examples:
  - "Backend API v2 Redesign"
  - "Mobile - iOS App Rewrite"
  - "Platform - Observability Initiative"

**Achievement Titles:**
- Start with action verb
- Include key outcome or impact
- Keep under 100 characters for readability
- Make searchable

### Archiving Strategy

**What to Archive:**
- Very old achievements (>5 years)
- Minor fixes not worth highlighting
- Deprecated project work
- Experiments that didn't pan out

**What NOT to Archive:**
- Anything from current review period
- High-impact achievements (regardless of age)
- Achievements you might reference in interviews
- Unique or innovative work

**When to Archive:**
- Quarterly cleanup sessions
- When total achievements exceeds 500+
- After career transitions
- During performance review prep (archive old items you won't use)

### Search and Tagging

**Use Descriptive Titles:**
Make achievements easy to find later:
- Include technology names
- Mention business impact
- Reference team or product

**Project/Company as Tags:**
- Consistently link achievements to projects
- Use company field for filtering
- Create projects for cross-cutting initiatives

**Custom Filtering:**
Create custom views for common searches:
- "This Quarter's Work"
- "Leadership Contributions"
- "Technical Improvements"
- "High-Impact Achievements"

## Conclusion

The key to getting value from BragDoc is consistency:

1. **Make it a Habit**: Weekly extraction and review
2. **Be Specific**: Clear titles, quantified impact
3. **Stay Organized**: Link to projects and companies
4. **Review Regularly**: Keep information fresh and accurate
5. **Use for Real Tasks**: Performance reviews, updates, interviews

Start with one workflow that fits your routine, then expand as you see the benefits.

---

**Need Help?** Check the **[FAQ & Troubleshooting](./faq.md)** guide or refer back to the **[Getting Started Guide](./getting-started.md)** for basics.
