# Changeset Management Process

This document defines the process for managing changesets in the BragDoc monorepo. Changesets are used to track versioning and generate changelogs for packages that are published or have versioned releases.

## Purpose

Changesets help us:
- Track which packages have changes that need versioning
- Automatically generate changelogs
- Coordinate version bumps across the monorepo
- Communicate changes to users of our packages (especially the CLI)

## When Changesets Are Required

### Always Create a Changeset For:

1. **CLI Package Changes (`packages/cli/`)**
   - The CLI is published to npm and has external users
   - All functional changes require a changeset
   - Bug fixes, features, and breaking changes must be documented

2. **Published Package Changes**
   - Any package that is or will be published to npm
   - Currently: `@bragdoc/cli`
   - Future: Any other packages we decide to publish

### Never Create a Changeset For:

1. **Internal-Only Changes**
   - Web app changes (`apps/web/`)
   - Marketing site changes (`apps/marketing/`)
   - Internal utilities not published to npm

2. **Database Package Changes**
   - Changes to `packages/database/` (internal-only)
   - Database schema changes (tracked separately)

3. **Documentation-Only Changes**
   - Updates to README files
   - Changes to `.claude/docs/`
   - Comment additions or improvements
   - CLAUDE.md updates

4. **Development Infrastructure**
   - Build configuration changes
   - Test setup modifications
   - Linting/formatting changes
   - CI/CD pipeline updates
   - Unless these changes affect published package behavior

5. **Dependency Updates**
   - Routine dependency updates
   - Unless they introduce breaking changes or significant new features

## Decision Framework for Planners

When creating a plan, follow this decision tree:

```
Does the plan modify code in packages/cli/src/?
│
├─ YES → Does it change functionality, fix bugs, or affect CLI behavior?
│  │
│  ├─ YES → CHANGESET REQUIRED
│  │        Include changeset phase in plan
│  │
│  └─ NO → (Only comments, formatting, internal refactoring with no behavior change)
│           NO CHANGESET NEEDED
│
└─ NO → Does it modify any other published package?
   │
   ├─ YES → CHANGESET REQUIRED
   │         Include changeset phase in plan
   │
   └─ NO → NO CHANGESET NEEDED
            Omit changeset phase from plan
```

## Changeset Type Selection

When a changeset is required, determine the appropriate type:

### Patch (Bug Fixes)
- Fixes incorrect behavior
- Corrects errors or bugs
- Improves error messages
- Performance improvements without API changes
- Security fixes that don't change API

**Example keywords:** "fix", "correct", "resolve", "patch"

### Minor (New Features)
- Adds new functionality
- Adds new commands or options
- Enhances existing features
- Backward-compatible additions
- New capabilities that don't break existing usage

**Example keywords:** "add", "introduce", "enhance", "support", "implement"

### Major (Breaking Changes)
- Removes existing functionality
- Changes command signatures
- Modifies output formats in incompatible ways
- Requires user action to upgrade
- Changes default behavior in incompatible ways

**Example keywords:** "remove", "breaking", "deprecate", "replace", "redesign"

**⚠️ Use major bumps sparingly** - They require users to update their usage. Prefer backward-compatible designs when possible.

## Changeset Content Guidelines

### Description Format

Changesets should be written for **end users** of the package, not internal developers. Use clear, non-technical language when possible.

**Good changeset descriptions:**
```
- Fixed CLI authentication failing when config file has incorrect permissions
- Added `--force` flag to `bragdoc extract` command to bypass confirmation prompts
- Improved error messages when Git repository is not initialized
```

**Poor changeset descriptions:**
```
- Fixed bug in auth.ts where file permissions were not checked
- Refactored extract command to use new confirmPrompt utility
- Updated error handling for GitRepositoryNotFound exception
```

### Multiple Changes

If a plan includes multiple types of changes, create separate changesets:

```markdown
### Phase N: Changesets

- [ ] Create patch changeset for authentication bug fix
- [ ] Create minor changeset for new --force flag feature
```

### Referencing Issues

If applicable, reference issue numbers or user feedback:

```
Fixed authentication timeout issue when running CLI on slow connections (#127)
```

## Integration with Planning Workflow

### For spec-planner Agent

During plan creation:

1. **Analyze affected files** - Identify which packages will be modified
2. **Apply decision framework** - Determine if changeset is needed
3. **Include changeset phase if needed** - Add to plan before after-action report phase
4. **Specify changeset type** - Based on the nature of changes (patch/minor/major)
5. **Draft changeset description** - Write user-facing description of changes

### For quick-task-planner Agent

During quick task planning:

1. **Check if CLI is affected** - Review task scope
2. **Apply same decision framework** - Same rules as spec-planner
3. **Include changeset in plan if needed** - Before after-action report
4. **Keep description concise** - Quick tasks typically have focused changes

## Changeset Phase Structure in Plans

When a plan requires a changeset, include this phase:

```markdown
### Phase [N]: Changeset

**Purpose:** Document changes for package versioning and changelog generation.

- [ ] Create changeset by running `pnpm changeset`
- [ ] Select changeset type:
  - **patch**: Bug fixes, corrections, minor improvements
  - **minor**: New features, enhancements (backward-compatible)
  - **major**: Breaking changes (use sparingly)
- [ ] Select affected package: `@bragdoc/cli`
- [ ] Write user-facing description of changes:
  - Focus on what changed from a user perspective
  - Be clear and specific
  - Use imperative mood (e.g., "Add support for...", "Fix issue with...")
  - Example: "Fixed CLI authentication failing when config file has incorrect permissions"
- [ ] Verify changeset file created in `.changeset/` directory
- [ ] Commit changeset file with implementation changes
```

**Placement:** The changeset phase should come after implementation phases but before the after-action report phase.

**Example plan structure:**
```
Phase 1: Database Changes
Phase 2: API Implementation
Phase 3: CLI Command Implementation
Phase 4: Changeset          ← Add here
Phase 5: After-Action Report
```

## Integration with Implementation Workflow

### For plan-executor Agent

When implementing a plan with a changeset phase:

1. **Complete all implementation work first** - Don't create changeset until code is complete
2. **Run `pnpm changeset` from project root** - Interactive CLI will prompt for details
3. **Select the package** - Choose `@bragdoc/cli` or other affected package
4. **Select the change type** - patch/minor/major based on plan guidance
5. **Write the description** - Follow the guidance from the plan
6. **Verify changeset created** - Check `.changeset/` directory for new file
7. **Commit with implementation** - Include changeset in the same commit as code changes
8. **Document in LOG.md** - Record changeset creation and rationale

### Example Changeset Creation

```bash
# From project root
cd /Users/ed/Code/brag-ai
pnpm changeset

# Interactive prompts:
? Which packages would you like to include? › @bragdoc/cli
? What kind of change is this for @bragdoc/cli? › minor
? Please enter a summary for this change (this will be in the changelog):
  › Added --force flag to extract command to bypass confirmation prompts
```

This creates a file like `.changeset/brave-lions-sing.md`:

```markdown
---
"@bragdoc/cli": minor
---

Added --force flag to extract command to bypass confirmation prompts
```

## Common Scenarios

### Scenario 1: CLI Bug Fix

**Situation:** Fixing an authentication bug in the CLI

**Decision:** Changeset REQUIRED (patch)
- Affects published CLI package
- Fixes incorrect behavior
- Users need to know about the fix

**Changeset phase:**
```markdown
### Phase 3: Changeset

- [ ] Create patch changeset for authentication bug fix
- [ ] Description: "Fixed authentication failing when config file has incorrect permissions"
```

### Scenario 2: New CLI Command

**Situation:** Adding a new `bragdoc status` command

**Decision:** Changeset REQUIRED (minor)
- Adds new CLI functionality
- Backward-compatible addition
- Users will want this in the changelog

**Changeset phase:**
```markdown
### Phase 4: Changeset

- [ ] Create minor changeset for new status command
- [ ] Description: "Added `bragdoc status` command to view repository sync status and configuration"
```

### Scenario 3: CLI Internal Refactoring

**Situation:** Refactoring CLI code structure with no behavior changes

**Decision:** NO CHANGESET NEEDED
- No user-facing changes
- Internal code organization only
- Users won't notice any difference

**Plan structure:** Omit changeset phase entirely

### Scenario 4: Web App Feature

**Situation:** Adding a new achievements export feature to the web app

**Decision:** NO CHANGESET NEEDED
- Web app is not a published package
- Changes are deployed, not versioned
- No package changelog needed

**Plan structure:** Omit changeset phase entirely

### Scenario 5: Breaking CLI Change

**Situation:** Removing deprecated `--legacy` flag from CLI command

**Decision:** Changeset REQUIRED (major)
- Breaks backward compatibility
- Users relying on flag will be affected
- Requires major version bump

**Changeset phase:**
```markdown
### Phase 5: Changeset

- [ ] Create major changeset for breaking change
- [ ] Description: "Removed deprecated `--legacy` flag from extract command. Use the default behavior instead."
- [ ] ⚠️ Note: This is a BREAKING CHANGE - users must update their usage
```

### Scenario 6: Database Schema Change

**Situation:** Adding a new table to support CLI repository tracking

**Decision:** Depends on CLI changes
- If CLI code changes to use new table: CHANGESET REQUIRED (minor/patch depending on behavior)
- If only database schema changes with no CLI impact: NO CHANGESET NEEDED

### Scenario 7: Documentation Update

**Situation:** Improving CLI command documentation in README

**Decision:** NO CHANGESET NEEDED
- Documentation changes don't affect package versioning
- README updates are visible immediately in repository
- No package release needed

### Scenario 8: Dependency Update

**Situation:** Updating a CLI dependency to patch security issue

**Decision:** Usually CHANGESET REQUIRED (patch)
- Security fixes should be documented
- Users need to know to update
- Exception: Pure dev dependencies that don't affect runtime

**Changeset phase:**
```markdown
### Phase 2: Changeset

- [ ] Create patch changeset for security update
- [ ] Description: "Updated dependencies to address security vulnerabilities"
```

## Changeset Best Practices

### DO:
- Create changesets when code behavior changes for published packages
- Write descriptions from the user's perspective
- Be specific about what changed
- Use imperative mood ("Add", "Fix", "Remove")
- Keep descriptions concise but informative
- Create separate changesets for unrelated changes
- Commit changesets with implementation code

### DON'T:
- Create changesets for internal-only code
- Write descriptions with technical jargon
- Include implementation details users don't need
- Create changesets for work-in-progress
- Forget to commit changeset files
- Create changesets before implementation is complete

## Verification Checklist

Before finalizing a plan with a changeset phase:

- [ ] Changeset is only included if published package is affected
- [ ] Changeset type (patch/minor/major) matches change nature
- [ ] Changeset description is user-facing and clear
- [ ] Changeset phase is placed after implementation, before after-action report
- [ ] Implementation instructions include running `pnpm changeset`
- [ ] Plan explains which package(s) to select during changeset creation

Before marking changeset phase complete during implementation:

- [ ] Ran `pnpm changeset` from project root
- [ ] Selected correct package(s)
- [ ] Selected appropriate change type
- [ ] Wrote clear, user-facing description
- [ ] Verified changeset file exists in `.changeset/` directory
- [ ] Committed changeset file with implementation changes
- [ ] Documented changeset creation in LOG.md

## Related Documentation

- **For planners:** See `.claude/agents/spec-planner.md` and `.claude/agents/quick-task-planner.md`
- **For implementers:** See `.claude/agents/plan-executor.md` and `.claude/docs/processes/engineer-rules.md`
- **Changesets tool:** See [https://github.com/changesets/changesets](https://github.com/changesets/changesets)
- **BragDoc patterns:** See `CLAUDE.md` in project root

## Future Considerations

As the BragDoc project evolves:

- Additional packages may become publishable and require changesets
- We may publish `@bragdoc/database` if we extract it for reuse
- Custom tooling may be built on top of changesets for automation
- This process should be updated as changeset needs change

---

**Last Updated:** 2025-10-23 (Initial creation)
**Maintained By:** Process Manager agent
**Update Trigger:** When changeset requirements change, when new packages become publishable, or when after-action reports identify issues with this process
