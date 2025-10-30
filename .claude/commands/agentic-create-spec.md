---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write
argument-hint: [instructions]
description: Fully create a spec using sub agents, including comprehensive review and revision
---

## Task: Use sub agents to create an entire spec from start to finish

You will make extensive use of the following sub-agents:

@spec-writer - Use this agent to create the spec
@spec-checker - Use this agent to review and revise the spec

The sub-agents have specialized knowledge and abilities, but also, delegating to them allows you to use less of your LLM context on solving issues, as you are playing an orchestrator role. Try to delegate to these sub-agents as much as possible.

## Process

1. Ask the spec writer agent to create a spec for the task at hand.
2. Ask the spec checker agent to review and revise the spec.
3. If the spec checker agent asks you to make changes to the spec, make those changes
4. Once you are done, please report back with the status of the spec.

## Critical File Management Instructions

**IMPORTANT:** The spec creation process should produce ONLY ONE FILE: `SPEC.md`

**When delegating to sub-agents, explicitly instruct them:**
- Make all refinements directly within SPEC.md rather than creating new support documents
- Do NOT create additional files such as:
  - VALIDATION-REPORT.md
  - QUICK-REFERENCE.md
  - IMPROVEMENTS-SUMMARY.md
  - REVIEW-NOTES.md
  - Or any other support documents
- Include any review notes, validation findings, or improvement suggestions as inline comments or in a "Review Summary" section at the end of SPEC.md
- All feedback and refinements must be incorporated directly into the SPEC.md content

**Rationale:**
- Keeps task directories clean and focused on core deliverables
- Users expect only SPEC.md as the output
- Easier to version control and track changes
- Reduces cognitive load for developers reading the spec

## Instructions

- If, during investigation and creation of the spec, it becomes clear that the specification was not possible, immediately stop what you're doing and ask the user for how to proceed.
