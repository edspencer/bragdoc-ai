---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [plan-file] [instructions]
description: Review an implementation of a plan
---

# Review an implementation of a plan

Your task is to review an implementation of a plan ($1). If you were additional instructions ($2), please pay attention to them. Output a REVIEW.md of your findings and recommendations, and then offer to implement any of them that you think are most pressing (if any).

## Instructions

- Read the plan document carefully before starting to review the implementation
- Look at the staged git changes to see what has been implemented (if nothing is staged, look at unstaged instead)
- Check each part of the plan to see if it has been implemented fully and correctly
- Do not build the apps/web app - the developer already has a dev build running on port 3000 and running build interferes with this
- If you find any areas where the plan does not appear to have been implemented fully or correctly, please note them in the REVIEW.md
