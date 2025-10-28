---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [spec-file] [instructions]
description: Fully create a plan using sub agents, including comprehensive review and revision
---

## Task: Use sub agents to create an entire plan from start to finish

You will make extensive use of the following sub-agents:

@plan-writer - Use this agent to create the plan
@plan-checker - Use this agent to review and revise the plan

The sub-agents have specialized knowledge and abilities, but also, delegating to them allows you to use less of your LLM context on solving issues, as you are playing an orchestrator role. Try to delegate to these sub-agents as much as possible.

## Process

1. Read the entire SPEC.md file for the task at hand (unless you were just given a text description of the specification)
2. Ask the plan writer agent to create a plan for the task at hand.
3. Ask the plan checker agent to review and revise the plan.
4. If the plan checker agent asks you to make changes to the plan, make those changes

Once you are done, please report back with the status of the plan.

## Instructions

- If, during investigation and creation of the plan, it becomes clear that the specification was not possible, immediately stop what you're doing and ask the user for how to proceed.
