---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write(PLAN.md)
argument-hint: [spec-file]
description: Create a plan to implement a certain specification
---

# Create a plan for implementing a certain specification

Your task is to create a PLAN.md file that outlines the steps required to implement a certain specification.

## Data you have access to

### Spec file (argument 1)

The spec file argument ($1) to understand what we're importing this time. It will provide you will some or all of the following sections of information:

- Task - overall short description of the task
- Background Reading - any additional information you should read to understand the context of the task
- Specific Requirements - any specific requirements for the task

It may contain other information too, which you should pay attention to.

## Your Task

Your task is to use the details in the spec file, read and understand any content it refers to, and ultrathink to create a detailed PLAN.md document in the same directory as the spec file ($1). The PLAN.md document should contain a thorough plan for implementing the specification, following any additional instructions outlined in the spec file.

### Plan requirements

IMPORTANT: Our PLAN.md documents follow very strict plan requirements, as detailed in .claude/docs/plan-requirements.md. Read that file very carefully and adhere strictly to its guidance.

### Separate Test Plan Requirements

Most plans you will be asked to make will involve some level of testing. You should create a separate TEST_PLAN.md file in the same directory as the spec file ($1). The TEST_PLAN.md file should contain a thorough plan for testing the specification, following any additional instructions outlined in the spec file.

If the plan genuinely does not call for any testing, do not create a TEST_PLAN.md file.

If you do create a TEST_PLAN.md file, refer to its existence in the main PLAN.md file, which should also contain a very high level summary of what the test plan calls for.

# Get started

Please start your plan and save it to PLAN.md
