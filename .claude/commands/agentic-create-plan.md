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

## Critical File Management Instructions

**IMPORTANT:** The plan creation process should produce THREE FILES: `PLAN.md`, `TEST_PLAN.md`, and `COMMIT_MESSAGE.md`

**When delegating to sub-agents, explicitly instruct them:**
- The plan-writer agent will create PLAN.md, TEST_PLAN.md, and COMMIT_MESSAGE.md as part of the planning phase
- Make all refinements directly within PLAN.md and TEST_PLAN.md rather than creating support documents
- Do NOT create additional files such as:
  - VALIDATION-REPORT.md
  - IMPLEMENTATION-NOTES.md
  - REVIEW-SUMMARY.md
  - QUICK-REFERENCE.md
  - IMPROVEMENTS-SUMMARY.md
  - Or any other support documents
- Include any validation findings, implementation notes, or review feedback directly in the appropriate sections of PLAN.md
- All architectural decisions and technical details belong in PLAN.md, not separate files

**Rationale:**
- Keeps task directories clean and focused on core deliverables
- Users expect PLAN.md, TEST_PLAN.md, and COMMIT_MESSAGE.md as standard outputs
- COMMIT_MESSAGE.md provides a draft commit message that can be verified/updated at completion
- Easier to version control and track changes
- Reduces cognitive load for developers following the plan
- Simplifies onboarding (fewer files to read)

## Instructions

- If, during investigation and creation of the plan, it becomes clear that the specification was not possible, immediately stop what you're doing and ask the user for how to proceed.
