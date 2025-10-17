---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [plan-file] [instructions]
description: Implement a plan
---

# Implement a plan document

You have been given a plan document to implement ($1). Your task is to fully read and understand the plan document, and then implement it. If you were additional instructions ($2), please pay attention to them.

## Instructions

- Read the plan document carefully before starting to implement it
- Update the plan document as you go; each time you complete a task, mark it as done in the plan document using the checkbox
- Keep a LOG.md file in the same directory as the plan document, and update it as you go. This should be a log of all key decisions you make, and any issues you encounter and how you resolved them, deviations from the plan, updated guidance from the user, and so on.
- Do run a `pnpm run build` for the `apps/web` project when you think you are done with a phase or entire implementation, so we can catch any build failures early
- Do run `pnpm run test` at the project root when you think you are done with a phase or entire implementation, so we can catch any test failures early
- Do run `pnpm run format` at the project root when you think you are done with a phase or entire implementation, so we can catch any formatting issues early
- Do run `pnpm run lint` at the project root when you think you are done with a phase or entire implementation, so we can catch any lint issues early. Fix any lint issues that affect files you have edited
- The dev server is almost always running whenever you are working. The server runs on port 3000, and its logs are continually written to ./apps/web/.next-dev.log in the root of the project. Scan this file for errors and warnings, and use it to debug issues.
