---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [plan-file] [instructions]
description: Fully implement a plan using sub agents
---

## Task: Use sub agents to implement an entire plan from start to finish

You will make extensive use of the following sub-agents:

@code-writer - Use this agent to implement each phase of the plan
@browser-tester - Use this agent to test the web app using Playwright after each phase of the plan (if there were UI changes)

The sub-agents have specialized knowledge and abilities, but also, delegating to them allows you to use less of your LLM context on solving issues, as you are playing an orchestrator role. Try to delegate to these sub-agents as much as possible.

## Process

Read the entire PLAN.md file you are given.

Starting with Phase 1, delegate the implementation of the phase to the code writer agent. The code writer agent will have minimal context so you will have to give it the information it needs, which should include a reference to the PLAN.md file, which phase the agent should work on, any relevant context about the implementation so far, and so on. The code writer agent does have general context about this application, and understands how to look up technical docs.

After the code writer agent finishes a batch of work and you check it: if it got something wrong that you can easily fix, fix it. If it got something wrong that needs extensive correction, stop and ask me for help

### Process for each phase

The process for each phase is as follows (in order):

1. Ask the code writer agent to implement the phase
2. Check the code writer agent's implementation
3. If it got something wrong that you can easily fix, fix it, else escalate to me
4. Run the `lint`, `format`, `test`, and `build` commands at the project root to catch any issues early
5. If the phase contains UI changes, ask the web app tester agent to test the web app using Playwright after the phase
6. Check that the PLAN.md and LOG.md have been updated to reflect the completed work

If all of those checks pass, then the phase is complete and you can move on to the next phase. If any of those checks fail, you should stop and ask me for help.

## Example run

A typical full agentic implementation might look like this, for a PLAN.md containing 4 stages, where stages 2 and 3 contain UI changes that should be checked:

1. You read the PLAN.md file
2. You asked the code writer agent to implement phase 1
3. You check what the code writer agent did in its phase 1 implementation and decided it was correct
4. You asked the code writer agent to implement phase 2 (which contains UI changes)
5. You check what the code writer agent did in its phase 2 implementation and decided it was correct
6. You asked the web app tester agent to test the web app using Playwright after phase 2, because it contains UI changes
7. You asked the code writer agent to implement phase 3 (which contains UI changes)
8. You check what the code writer agent did in its phase 3 implementation and decided it was correct
9. You asked the web app tester agent to test the web app using Playwright after phase 3, because it contains UI changes
10. You asked the code writer agent to implement phase 4
11. You check what the code writer agent did in its phase 4 implementation and decided it was correct

At this point, you should prepare your final report:

## Creating the Final Commit Message

Before reporting back to the user, create a commit message for the completed work:

1. **Check for COMMIT_MESSAGE.md**: Look for a COMMIT_MESSAGE.md file in the task directory
2. **If COMMIT_MESSAGE.md exists:**
   - Read the draft commit message that was created during planning
   - Verify it still accurately reflects what was actually implemented across all phases
   - If the implementation deviated significantly from the original plan (e.g., additional features added, approaches changed, scope adjusted):
     - Update COMMIT_MESSAGE.md to reflect the actual implementation
     - Ensure it mentions any major deviations or additions
   - Use the (possibly updated) COMMIT_MESSAGE.md as the basis for your suggested commit message
3. **If COMMIT_MESSAGE.md does not exist:**
   - Create a commit message from scratch based on the actual changes made across all phases
   - Follow the commit message guidelines below

### Commit Message Guidelines

The commit message should:

- Start with a 1-sentence summary on its own line
- Briefly explain what was done and why
- Typically be 2-4 paragraphs long (shorter for small changes, ~1-2 paragraphs for <300 LOC)
- Call out any key architectural or API changes
- Call out any key dependencies or tools being added/removed
- Call out any key data model changes
- Call out any key environment variable changes
- Avoid value judgments (e.g., don't say "improves" or "better")
- Keep it factual and not boastful

## Final Report

Give a full report back to the user, including:

- Summary of all phases completed
- Any issues encountered and how they were resolved
- The suggested git commit message (based on COMMIT_MESSAGE.md if it existed)
