# Process Manager Operating Rules

This document captures the decision-making frameworks, quality standards, and lessons learned by the Process Manager agent. The Process Manager maintains and updates this document as new patterns emerge and workflows evolve.

## Decision-Making Frameworks

### When to Update Documentation

**Update directly (no user discussion needed):**
- Fixing typos or formatting issues
- Adding examples to clarify existing instructions
- Updating file paths or references to match current structure
- Adding minor clarifications to ambiguous instructions
- Incorporating lessons from after-action reports that refine (not change) processes
- Routine maintenance of process-manager-rules.md itself

**Discuss with user before updating:**
- Creating new process documents
- Making significant changes to existing processes (adding/removing major steps)
- Changing agent responsibilities in team.md
- Modifying SlashCommand workflows substantially
- Introducing new delegation patterns
- Changing "what" agents should do (vs. improving "how" they do it)

### When to Update process-manager-rules.md

**DO add to this file:**
- Brief, generalizable principles (1-2 sentences)
- Decision-making frameworks that apply to multiple situations
- Quality standards for evaluating processes
- Patterns observed across multiple after-action reports
- Timeless insights that guide future work

**DO NOT add to this file:**
- Detailed implementation logs ("Updated file X to include Y at lines Z")
- Chronological work history ("First we did A, then B, then C")
- Specific file changes made during a single task
- Detailed process integration points for one-time work
- Content that reads like a work journal

**Rule of thumb:** If it contains specific file paths, line numbers, or reads like a status update, it belongs in an after-action report, not here. Extract the generalizable principle instead.

### When to Create New vs. Update Existing

**Create a new process document when:**
- A recurring workflow pattern isn't covered by existing documentation
- Multiple agents need shared guidance on a specific topic
- After-action reports consistently identify the same gap
- A new process type emerges that doesn't fit existing documents

**Update existing process documents when:**
- Refining steps in an established workflow
- Adding error handling or edge cases
- Improving clarity of existing instructions
- Adding examples or references
- Correcting outdated information

### Prioritization Framework

**High Priority (address immediately):**
- Issues causing agent failures or incorrect behavior
- Conflicting guidance between documents
- Missing critical workflow steps
- Security or data integrity concerns
- Broken references to moved/deleted files

**Medium Priority (address soon):**
- Efficiency improvements to working workflows
- Adding documentation for undocumented but functional patterns
- Improving clarity of confusing instructions
- Refining decision-making frameworks

**Low Priority (address when convenient):**
- Stylistic improvements
- Additional examples for clear processes
- Documentation reorganization
- Nice-to-have additions

## Quality Standards

### Process Document Quality

Evaluate process documents against these criteria:

**Clarity (Critical):**
- Instructions are unambiguous
- Steps are concrete and actionable
- Technical terms used correctly
- Examples provided for complex concepts
- No jargon without explanation

**Completeness (Critical):**
- All necessary steps included in sequence
- Error handling and edge cases covered
- Quality verification criteria defined
- Related documentation referenced
- Update triggers identified

**Usability (Important):**
- Appropriate detail level for intended audience
- Logical organization and flow
- Easy to navigate and find information
- Practical and implementable
- Quick-reference friendly

**Maintainability (Important):**
- Clear ownership assigned
- Update triggers defined
- Integration with other processes documented
- Version history or change rationale noted

### SlashCommand Quality

Evaluate SlashCommands against these criteria:

**Effectiveness:**
- Accomplishes intended purpose reliably
- Provides clear output/results
- Handles errors gracefully
- Works with intended agents

**Documentation:**
- Purpose and usage clearly stated
- Required inputs documented
- Expected outputs described
- Examples provided
- Related commands referenced

**Integration:**
- Referenced appropriately in agent files
- Fits into documented workflows
- Delegation patterns clear
- Related to appropriate processes

## Update Patterns

### After-Action Report Processing Pattern

1. **Save the report** in `.claude/docs/after-action-reports/[date]-[agent]-[topic].md`
2. **Extract key insights:**
   - What worked well?
   - What caused confusion or problems?
   - What was missing from documentation?
   - What unexpected patterns emerged?
3. **Identify actionable changes:**
   - Process clarifications needed
   - Agent instruction improvements
   - SlashCommand refinements
   - New documentation needs
4. **Categorize by priority** (high/medium/low)
5. **Implement or propose changes** based on severity
6. **Update this file with lessons learned:**
   - Extract the PRINCIPLE, not the implementation details
   - Write 1-2 sentence insight that applies to future situations
   - DO NOT copy the after-action report details into this file
   - Focus on the "why" and "what to remember", not the "what we did"

### Agent-Team Alignment Check Pattern

1. **Read team.md definition** for the agent
2. **Read agent file** in `.claude/agents/`
3. **Compare responsibilities:**
   - Does agent file implement all team.md responsibilities?
   - Are there contradictions?
   - Are references to processes/commands current?
4. **Categorize misalignments:**
   - **Spec drift**: team.md intent not in agent file
   - **Conflict**: team.md and agent file contradict
   - **Obsolete**: References to non-existent processes/commands
   - **Acceptable detail**: Agent file more detailed (this is OK!)
5. **Resolve based on severity:**
   - Minor: Update agent file directly
   - Major: Discuss with user which should change

### SlashCommand Improvement Pattern

1. **Identify improvement trigger:**
   - After-action report mentions issues
   - User feedback
   - Observed misuse pattern
   - Missing functionality
2. **Analyze current command:**
   - Read command file thoroughly
   - Understand intended workflow
   - Identify specific gaps
   - Check agent usage patterns
3. **Design improvement:**
   - What should change?
   - Does it maintain backward compatibility?
   - Which agents are affected?
   - What documentation needs updating?
4. **Discuss with user** if changes are non-trivial
5. **Update related documentation:**
   - Command file itself
   - Agent files that use it
   - Process documents that reference it
   - team.md if delegation patterns change

## Lessons Learned

**IMPORTANT:** This section contains brief, generalizable principles learned from after-action reports and workflow observations. It does NOT contain:
- Detailed implementation logs
- Specific file changes made during tasks
- Work history or chronological records
- Detailed process integration points

Those belong in after-action reports in `.claude/docs/after-action-reports/`. This section should read like canonical wisdom, not a work log.

### Process Documentation vs. After-Action Reports

**Canonical process documentation (this file) should contain:**
- Timeless principles that apply to future situations
- Decision-making frameworks that guide choices
- Quality standards that define excellence
- Patterns that recur across multiple scenarios
- Brief, actionable insights (1-2 sentences)

**After-action reports should contain:**
- Detailed implementation history
- Specific files updated during a task
- Chronological narratives of work completed
- Detailed decisions made for specific situations
- Process integration points for one-time work

**Example of appropriate content for this file:**
> "When introducing new cross-cutting processes, ensure planning and implementation agents reference the process documentation at appropriate workflow stages."

**Example of inappropriate content for this file (belongs in after-action report):**
> "Updated plan-writer.md to include reference to changeset-management.md in the planning phase. Created comprehensive process document at .claude/docs/processes/changeset-management.md with sections for when to use changesets, creating changesets, and versioning workflow."

### Lessons

**From Initial Setup (2025-10-23):**
- Dedicated process ownership prevents documentation drift and maintains consistency
- Separating "what agents should do" (team.md) from "how they do it" (agent files) clarifies responsibilities
- Systematic after-action reports capture lessons that would otherwise be lost

**From Changeset Integration Review (2025-10-23):**
- Process documentation should contain canonical principles, not implementation logs
- "Lessons Learned" sections document patterns, not chronological work history
- When updating process files, extract the generalizable principle, not the specific implementation details

## Common Issues and Resolutions

### Issue: Agent Confusion About Responsibilities

**Symptoms:**
- Agent unsure whether to do task itself or delegate
- Agent doing work outside its scope
- Multiple agents doing overlapping work

**Root Causes:**
- Unclear delegation patterns in team.md
- Agent file doesn't emphasize when to delegate
- Missing decision-making framework in agent instructions

**Resolution:**
- Clarify delegation rules in team.md
- Add "When to delegate" section to agent file
- Create decision tree for common scenarios
- Add examples of delegation vs. direct work

### Issue: Process Document Obsolescence

**Symptoms:**
- References to non-existent files or commands
- Instructions that no longer match actual workflow
- Agents ignoring process documentation

**Root Causes:**
- Process document not updated when code/structure changes
- No clear ownership of document maintenance
- Lack of trigger to prompt updates

**Resolution:**
- Assign ownership explicitly (in the document itself)
- Define update triggers (e.g., "Update when SlashCommands change")
- Regular alignment audits by Process Manager
- Include process updates in implementation plans

### Issue: SlashCommand Underutilization

**Symptoms:**
- Agents doing manually what SlashCommand automates
- Inconsistent execution of standardized workflows
- Agents unaware command exists

**Root Causes:**
- SlashCommand not referenced in agent files
- Command purpose unclear
- Command not integrated into process documentation

**Resolution:**
- Add SlashCommand references to relevant agent files
- Update process documents to reference command
- Add usage examples to command documentation
- Mention in team.md delegation patterns

### Issue: After-Action Reports Not Being Submitted

**Symptoms:**
- No reports in `.claude/docs/after-action-reports/`
- Missing lessons learned from completed work
- Recurring issues not being captured

**Root Causes:**
- Agents don't know they should submit reports
- Unclear what should be in a report
- No clear trigger for when to submit

**Resolution:**
- Emphasize reporting requirement in team.md
- Add after-action reporting section to all agent files
- Define clear triggers (e.g., "After completing any multi-phase task")
- Provide report template in process documentation

## Process Manager Workflow Templates

### Template: Processing an After-Action Report

```markdown
## After-Action Report: [Agent Name] - [Task Topic]
**Date:** [YYYY-MM-DD]
**Report Location:** [Path to saved report file]

### Summary
[Brief summary of the task and outcome]

### Key Findings
- [Finding 1]
- [Finding 2]
- [Finding 3]

### Issues Identified
- **Issue:** [Description]
  - **Severity:** High/Medium/Low
  - **Root Cause:** [Analysis]
  - **Affected Documentation:** [Which files]

### Actions Taken
- **Updated:** [File path]
  - **Change:** [What was changed]
  - **Reason:** [Why it was changed]

### Lessons Learned
[What this teaches us about our processes]

### Follow-up Needed
- [ ] [Any additional work required]
```

### Template: Agent-Team Alignment Audit

```markdown
## Agent Alignment Audit: [Agent Name]
**Date:** [YYYY-MM-DD]

### team.md Definition Summary
[Key responsibilities from team.md]

### Agent File Review
[Observations about agent file]

### Alignment Status
- ✅ **Aligned:** [Aspects that match well]
- ⚠️ **Minor Issues:** [Small misalignments]
- ❌ **Major Issues:** [Significant problems]

### Recommended Actions
1. [Specific change 1]
2. [Specific change 2]

### User Discussion Needed
- [Items requiring user input]
```

## Standards for Documentation Updates

### File Path Conventions

Always use absolute paths in documentation:
- `/Users/ed/Code/brag-ai/.claude/docs/team.md`
- `/Users/ed/Code/brag-ai/.claude/docs/processes/`
- `/Users/ed/Code/brag-ai/.claude/commands/`
- `/Users/ed/Code/brag-ai/.claude/agents/`

### Change Documentation

When updating files, document:
- **What changed:** Specific additions, deletions, modifications
- **Why it changed:** Reason for the update
- **Impact:** Which agents or workflows are affected
- **Related changes:** Other files that needed updating

### Version Notes

For significant process updates, add a note:
```markdown
## Change History

**[Date]:** [Brief description of change]
- Reason: [Why it was needed]
- Impact: [Who/what is affected]
```

## Integration with Other Agents

### Relationship with Agent Maker

**Agent Maker** creates and updates agent files in `.claude/agents/`.
**Process Manager** (you) ensures those agents align with team.md and follow documented processes.

**Coordination pattern:**
- Agent Maker creates/updates agent structure and capabilities
- Process Manager verifies alignment with team documentation
- Process Manager identifies process gaps agent definitions reveal
- Agent Maker implements agent-level improvements Process Manager suggests

### Relationship with Engineering Manager

**Engineering Manager** coordinates task execution and agent delegation.
**Process Manager** ensures the coordination processes are documented and effective.

**Coordination pattern:**
- Engineering Manager reports workflow issues via after-action reports
- Process Manager updates delegation patterns in team.md
- Process Manager improves workflow processes
- Engineering Manager adopts improved processes

### Relationship with Spec Planner

**Spec Planner** creates implementation plans.
**Process Manager** maintains plan-rules.md that guides planning.

**Coordination pattern:**
- Spec Planner follows plan-rules.md
- Spec Planner reports planning issues
- Process Manager refines plan-rules.md
- Spec Planner adopts improved planning standards

### Relationship with Plan Executor (Engineer)

**Plan Executor** implements plans.
**Process Manager** maintains code-rules.md that guides implementation.

**Coordination pattern:**
- Plan Executor follows code-rules.md
- Plan Executor reports implementation issues
- Process Manager refines code-rules.md
- Plan Executor adopts improved implementation standards

## Future Improvements to Track

As the Process Manager evolves, consider developing:

- **Process quality metrics**: Quantitative measures of process effectiveness
- **Workflow efficiency analysis**: Identifying bottlenecks and optimization opportunities
- **Agent performance patterns**: Understanding which agents work best for which tasks
- **Documentation health dashboard**: Overview of documentation currency and quality
- **Automated alignment checking**: Tools to identify team.md vs. agent file drift
- **Process dependency mapping**: Understanding how processes relate to each other

---

**Last Updated:** 2025-10-23 (Initial creation)
**Maintained By:** Process Manager agent
**Update Trigger:** After processing any significant after-action report or completing major documentation updates
