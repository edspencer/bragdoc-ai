---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [plan-file] [instructions]
description: Finish a planned piece of work
---

# Finish a planned piece of work

You have been given a plan document that has been implemented ($1). Your task is to run final cleanup commands and propose a git commit message

## Instructions

You should be able to do some or all of these in parallel:

- Run `pnpm run build` at the project root, so we can catch any build failures early
- Run `pnpm run test` at the project root, so we can catch any test failures early
- Run `pnpm run format` at the project root, so we can catch any formatting issues early
- Run `pnpm run lint` at the project root, so we can catch any lint issues early. Fix any lint issues that affect files you have edited

Give your final thoughts on the implementation. If you find any issues, please note them now but do not attempt to fix them.

If everything looks like it was completely successful, archive this task by moving it from ./tasks/TASK-NAME to ./tasks/archive/TASK-NAME (use git mv for this)

## Creating the Final Commit Message

Follow these steps to create the final commit message:

1. **Check for COMMIT_MESSAGE.md**: Look for a COMMIT_MESSAGE.md file in the task directory
2. **If COMMIT_MESSAGE.md exists:**
   - Read the draft commit message that was created during planning
   - Verify it still accurately reflects what was actually implemented
   - If the implementation deviated significantly from the original plan (e.g., additional features added, approaches changed, scope adjusted):
     - Update COMMIT_MESSAGE.md to reflect the actual implementation
     - Ensure it mentions any major deviations or additions
   - Use the (possibly updated) COMMIT_MESSAGE.md as the basis for your final commit message
3. **If COMMIT_MESSAGE.md does not exist:**
   - Create a commit message from scratch based on the actual changes made
   - Follow the commit message guidelines below

### Commit Message Guidelines

Your git commit message should:
- Start with a 1-sentence summary on its own line
- Be a sentence or two if only a file or two were changed, many paragraphs if dozens of files were changed, and anything in between
- Keep it factual and not boastful
- Briefly explain what we're doing and why
- Not just summarize the changes
- Typically be 2-4 paragraphs long (shorter for small changes, ~1-2 paragraphs for <300 LOC)
- Call out any key architectural or API changes
- Call out any key dependencies or tools being added/removed
- Call out any key data model changes
- Call out any key environment variable changes
- Avoid value judgments (e.g., don't say "improves" or "better")

Don't stage anything or commit anything, just propose the final git commit message now:
