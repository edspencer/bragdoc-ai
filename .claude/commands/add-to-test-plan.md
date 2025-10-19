---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write(PLAN.md)
argument-hint: [test-file]
description: Adds tests from a specific test file into our ongoing test plan
---

# Add Tests to UI Test Plan

You are tasked with maintaining our UI test plan located at ./test/integration/TEST-PLAN.md.

Your task is to add tests from the provided test file ($1) into the existing UI test plan. When adding tests:

1. **Review the existing test plan** to understand current test coverage
2. **Extract relevant tests** from the source test file ($1)
3. **Avoid duplicates** - don't add tests that already exist in the plan
4. **Merge intelligently** - combine similar tests rather than duplicating them
5. **Maintain organization** - keep tests grouped by category/feature
6. **Update test results** section if the source file contains test execution results
7. **Add to "Known Issues"** section if any issues are documented in the source

The run-integration-tests SlashCommand will be used separately to run these tests via the Playwright test runner.
