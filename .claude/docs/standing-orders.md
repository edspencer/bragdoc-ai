# Standing Orders

Cross-cutting concerns that apply to all agents. **ALWAYS check this document before beginning work.**

## Development Environment

### Dev Server Logs

**ALWAYS check dev server logs before and during implementation:**

- **Location:** `/Users/ed/Code/brag-ai/apps/web/.next-dev.log`
- **When to check:**
  - Before starting implementation (check for existing errors)
  - After making changes (verify no new errors introduced)
  - When debugging (look for runtime errors)
- **What to look for:** TypeScript errors, runtime errors, build warnings, console logs

### Testing Requirements

**ALWAYS run tests before marking tasks complete:**

```bash
# Run all tests
pnpm test

# Run specific tests
pnpm test [test-file-pattern]

# Build to verify no errors
pnpm build
```

- Run tests after code changes
- Fix any failing tests before completion
- Add tests for new functionality
- Verify build succeeds without errors

## Documentation Maintenance

### Update Documentation After Code Changes

**ALWAYS update relevant documentation when implementing changes:**

- **Technical docs** (`.claude/docs/tech/`): Update when architecture, patterns, or conventions change
- **User docs** (`.claude/docs/user/`): Update when user-facing features change
- **CLAUDE.md**: Update when project structure or conventions change
- **Process docs** (`.claude/docs/processes/`): Update when development processes change

### GitHub Task Sync

**Keep GitHub issues synchronized with local task work:**

- **Source of truth**: GitHub issues are the authoritative source for task documentation
- **Local cache**: Task files in `./tasks/` are working copies for agents to edit
- **Sync workflow**: Use the `github-task-sync` skill to push/pull task files (SPEC.md, PLAN.md, TEST_PLAN.md, COMMIT_MESSAGE.md)
- **When to sync**:
  - Pull from GitHub before starting work on a task
  - Push after major updates (spec validation, plan validation, implementation completion)
  - Final sync via `/finish` SlashCommand before archiving

**Reference:** See `.claude/skills/github-task-sync/SKILL.md` for complete documentation.

### Cross-Reference Validation

When updating files, check for cross-references that may need updating:

```bash
# Search for references to file/feature you're changing
grep -r "feature-name" /Users/ed/Code/brag-ai/.claude/
```

## Context Window Management

### When to Delegate vs. Handle Directly

**Delegate when:**
- Task requires specialized agent expertise (use agent-maker for agent work, blog-writer for blog posts, etc.)
- Context window is getting full (>75% of budget)
- Task is large and can be broken into subtasks
- Multiple independent subtasks can be parallelized

**Handle directly when:**
- Task is simple and within your expertise
- Delegation overhead exceeds direct implementation cost
- Context is already loaded (files read, patterns understood)
- Quick iteration is needed

### Context Window Strategies

1. **Read files strategically:** Only read files you need, use Grep/Glob first to find relevant files
2. **Use incremental approach:** Complete one subtask fully before moving to next
3. **Delegate large tasks:** Break into phases and delegate to fresh agents
4. **Reference previous work:** Link to existing documentation instead of re-reading

## Error Handling and Recovery

### Error Response Pattern

When encountering errors:

1. **Log the error:** Document what failed and why in LOG.md
2. **Analyze root cause:** Don't just treat symptoms, understand the underlying issue
3. **Check patterns:** Review existing code for similar patterns and solutions
4. **Verify fix:** Test thoroughly after fixing
5. **Document resolution:** Record solution for future reference

### Common Error Categories

- **TypeScript errors:** Check types, imports, and interfaces
- **Build errors:** Check next.config.js, dependencies, and build settings
- **Runtime errors:** Check dev server logs, browser console, and API responses
- **Test errors:** Check test setup, mocks, and assertions

### Recovery Steps

If blocked:
1. Document the blocker in LOG.md
2. Try alternative approaches based on codebase patterns
3. Search for similar issues in codebase/docs
4. Ask user for guidance if truly blocked
5. Never skip tasks without explicit instruction

## Quality Assurance

### Pre-Completion Checklist

Before marking any task complete:

- [ ] TypeScript: No type errors (`pnpm build` succeeds)
- [ ] Tests: All tests pass (`pnpm test` succeeds)
- [ ] Patterns: Code matches existing codebase patterns
- [ ] Security: All queries scoped by userId where applicable
- [ ] Documentation: Relevant docs updated
- [ ] Logs: Checked dev server logs for errors
- [ ] Verification: Manually verified functionality works

### Code Quality Standards

- Follow patterns in CLAUDE.md and `.claude/docs/tech/`
- Match existing code style (TypeScript strict mode, named exports, etc.)
- Add inline comments for complex logic
- Use descriptive variable/function names
- Keep functions focused and single-purpose

## Communication

### Log Updates

Keep LOG.md current:
- Mark tasks in_progress when starting
- Update with progress and decisions
- Document issues encountered
- Mark complete with verification notes
- Include file paths and specific changes

### User Communication

- Be concise but thorough
- Explain complex decisions and trade-offs
- Proactively identify potential issues
- Ask for clarification when ambiguous
- Provide actionable recommendations

## File Operations

### Path Usage

- **Always use absolute paths** in agent threads (cwd resets between bash calls)
- Check parent directory exists before creating files/directories
- Use proper error handling for file operations

### File Organization

Follow monorepo structure:
- `apps/web/` - Main Next.js app
- `apps/marketing/` - Marketing site
- `packages/database/` - Database layer
- `packages/cli/` - CLI tool
- `.claude/` - Agent system files

---

## Summary

These standing orders ensure consistent, high-quality work across all agents:

1. **Check dev logs** - Always monitor for errors
2. **Run tests** - Verify quality before completion
3. **Update docs** - Keep documentation current
4. **Manage context** - Delegate when appropriate
5. **Handle errors properly** - Document and resolve systematically
6. **Maintain quality** - Follow checklist before marking complete
7. **Communicate clearly** - Keep LOG.md and user informed
