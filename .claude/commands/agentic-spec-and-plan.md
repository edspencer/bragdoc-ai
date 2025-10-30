---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [instructions]
description: Write a spec and plan using sub agents
---

## Task: Use sub agents to create an entire plan from start to finish

This SlashCommand is just a wrapper around the /agentic-create-spec and /agentic-create-plan SlashCommands. It should just call those SlashCommands in order.

## Process

1. Call the /agentic-create-spec SlashCommand
2. Call the /agentic-create-plan SlashCommand
3. Report back with the status of the plan

## Instructions

- If, during investigation and creation of the plan, it becomes clear that the specification was not possible, immediately stop what you're doing and ask the user for how to proceed.
- You may be given a reference to a github issue or other ticket; if so, attempt to read the issue/ticket yourself first to make sure you have a clear understanding of the task at hand. Use that information to aid in your prompting of the sub agents via the slash commands.
