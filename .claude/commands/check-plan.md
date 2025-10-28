---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [plan-file] [spec-file]
description: Check a plan document against rules and suggest improvements
---

# Check a plan document against rules and suggest improvements

You have been given a plan document to check ($1). Your task is to fully read and understand the plan document, validate it against plan-rules.md, and suggest improvements if needed.

You may be given a spec document ($2) that the plan was based on, and you should compare the plan document against this spec document to ensure it is up to date and accurate.

Return a comprehensive list of issues found and suggested improvements. Propose a set of edits to the file, but do not actually make them without user approval.

## Instructions

- Read the plan document carefully before starting to check it
- Compare the plan document against the spec document if provided, extract any ways in which the plan deviates from the spec
- Compare the plan document against ./.claude/docs/processes/plan-rules.md, extract any ways in which the plan deviates from the plan requirements
- Check to see if the plan calls for the creation of any functions or features that don't seem to be used or called for and highlight them
