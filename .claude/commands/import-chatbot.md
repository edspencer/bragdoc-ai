---
allowed-tools: Bash, Edit, Grep, Read, WebSearch, WebFetch, Write(PLAN.md)
description: Create a plan for importing a piece of UX from ai-chatbot-main into our app
---

# Create a plan for importing a piece of UX from ai-chatbot-main into our app

Your task is to create a PLAN.md file that outlines the steps required to import a piece of UX from the /tmp/ai-chatbot-main directory into our app.

## Your Task

Your task is to produce a PLAN.md inside ./tasks/import-chatbot/PLAN.md, that outlines the large task of bringing in the canvas-mode chatbot UX from ./tmp/ai-chatbot-main into our app. Adhere closely to the rules in ./docs/plan-requirements.md.

### Notes

- We are not adding a chatbot in general to the app UI yet, only in the document editor.
- This certainly means that the way that the canvas-mode is triggered is different - in the /tmp/ai-chatbot-main it is triggered by a tool message in a chat session, rendered in the UI inside the chat history of that app's chat UI.
- We want to be able to enter this canvas mode via a normal CRUD-style interface inside our existing /reports page
- We do not want to support file upload or model selection yet; model selection should be done in apps/web/lib/ai/index.ts
- There are already Document and Chat models in schema.ts
- The Chat associated with each Document should be persistent in the database
- Our apps/web application was actually built off of a previous version of the ai-chatbot-main repository, so there's probably a bunch of similar/vestigial stuff. In all cases, prefer the newer versions.

### Plan requirements

IMPORTANT: Our PLAN.md documents follow very strict plan requirements, as detailed in ./docs/plan-requirements.md. Read that file very carefully and adhere strictly to its guidance.

Beyond the normal plan requirements, the following additional requirements apply:

- There are likely vestigial very similar files that already exist in apps/web; remove these in favor of the new files from /tmp/ai-chatbot-main

# Get started

Please start your plan and save it to PLAN.md
