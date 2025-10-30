---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [instructions]
description: Create an issue based on instructions, optionally creating a spec and plan
---

# Create an issue based on instructions

You're going to be given a variety of different possible instructions, but typically you're going to need to use the Github Task Sync skill to create an issue in the Github issues for this repository and potentially create a spec and a plan using the /agentic-create-spec and /agentic-create-plan commands. If the instructions don't specifically say don't do either one or both of those, then the default is that you should do so.

You are playing the role of orchestrator of these sub-agents, so it's important that you understand the issue yourself. However, you're going to delegate most of the work to the sub-agents to create spec and the plan. Then, you're going to report back afterwards as to what happened.
