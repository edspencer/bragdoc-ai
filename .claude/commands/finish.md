---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [plan-file] [instructions]
description: Finish a planned piece of work
---

# Finish a planned piece of work

You have been given a plan document that has been implemented ($1). Your task is to run final cleanup commands and propose a git commit message

## Instructions

- Run `pnpm run build` at the project root, so we can catch any build failures early
- Run `pnpm run test` at the project root, so we can catch any test failures early
- Run `pnpm run format` at the project root, so we can catch any formatting issues early
- Run `pnpm run lint` at the project root, so we can catch any lint issues early. Fix any lint issues that affect files you have edited

Give your final thoughts on the implementation. If you find any issues, please note them now but do not attempt to fix them.

If everything looks like it was completely successful, archive this task by moving it from ./tasks/TASK-NAME to ./tasks/archive/TASK-NAME

Finally, propose a git commit message for what was done in the plan. Your git commit message should be a sentence or two if only a file or two were changed, many paragraphs if dozens of files were changed, and anything in between. Keep it factual and not boastful. Don't stage anything or commit anything, just propose a git commit message now:
