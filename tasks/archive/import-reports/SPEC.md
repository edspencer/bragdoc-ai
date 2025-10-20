# Task

Import the /reports pages from tmp/v0-app into the main app

# Source V0 directory

V0 dir: tmp/v0-app/app/reports

# Background Reading

- Look at the /tmp/v0-app/app/reports directory and familiarize yourself with its pages, as well as any components it relies upon that we also need to bring in to the app
- Look at apps/web/app/(app)/documents/page.tsx - this is a vestigial page that should nevertheless have (via its child components and APIs) most of the actual functionality required in the new /reports pages (basically Document CRUD). Deeply research down the import tree of this page to understand what functionality already exists and can be reused.

### Specific Requirements

- Add a "For my manager" link to the app sidebar, linking to this new Reports page
- We're not implementing the document viewing or editing yet, so explicitly state that in the plan and do not create any tasks for it
