# Import Reports

The /tmp/v0-app directory contains an export of this application, as created by Vercel's v0 AI. We have been using v0 to create the UI skeleton for the app, then bringing it in section by section.

Now it is time to import the new /reports pages from tmp/v0-app into the main app. A little further down, I provide you with the complete prompt I gave v0 to generate this page, along with various pieces of rationale. This way you should understand the context of what we're building here.

Your task is to write a thorough plan for importing the /reports pages from tmp/v0-app into the main app. Write your plan to PLAN.md in this same directory.

### Background Reading

- Look at the /tmp/v0-app/app/reports directory and familiarize yourself with its pages, as well as any components it relies upon that we also need to bring in to the app
- Look at apps/web/app/(app)/documents/page.tsx - this is a vestigial page that should nevertheless have (via its child components and APIs) most of the actual functionality required in the new /reports pages (basically Document CRUD). Deeply research down the import tree of this page to understand what functionality already exists and can be reused.

### Specific Requirements

- Add a "For my manager" link to the app sidebar, linking to this new Reports page
- We're not implementing the document viewing or editing yet, so explicitly state that in the plan and do not create any tasks for it

### Notes

- The v0 pages all have just dummy data, so we need to integrate our real data.

### Plan requirements

- Your output should start with a brief section summarizing what the plan aims to do
- Then there should be a high-level overview of the plan tasks
- Under this there should be a numbered set of tasks to be performed, each with checkbox brackets so we cam mark our progress
- There should be tasks to copy the new pages into the main app, using the same directory structure
- The plan should have sufficient detail such that a junior programmer could be expected to follow it and successfully complete each task
- The plan should aim to reuse as much existing code as possible, so do a thorough scan of the codebase to understand what exists and where to find it
- The plan should assume the developer has never seen the codebase before, so should contain plentiful context about what exists and where to find it
- Specific files should be named, and important function signatures, interfaces and so on defined
- Clearly identify any existing code that we are able to reuse
- Every plan should have a final "Documentation" section, which should contain tasks to update our own internal documentation of the app. This should include a potential update to docs/FEATURES.md (if warranted) and updates to any other documents found in the docs/ directory. If we're adding a significant new piece of UI then we should have some document in that directory that describes the capabilities of that UI. There is a high chance this does not exist, so you should create it if not.

The plan document should itself contain an instructions section, much like this one. In that section should be at least the following instructions to the programmer performing the implementation:

- IMPORTANT: I want you to use the exact UX from the tmp/v0-app pages, don't change it when you bring it in to apps/web.
- Update the plan document as you go; each time you complete a task, mark it as done in the plan document using the checkbox

Add whatever other instructions you think are necessary, to help guide the programmer (which is almost certainly an LLM-based agent).

### Prompt given to v0 AI

Here is what I fed in to v0 to generate this UX:

<START-PROMPT>
Let's add an item on the left nav called "For my manager". Have it link to a new page that allows the user to view, edit and create various types of documents with the help of AI. The documents are all generated from achievements and aimed at the user's manager.

## Reports Page

On this new page, which should have the url /reports, but navigation called "For my manager", we want to have some buttons in a toolbar up top for creating Weekly, Monthly and Custom documents.

Underneath this toolbar should be a table of existing Reports. Reports have this type in the database:

```typescript
export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    title: text('title').notNull(),
    content: text('content'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    companyId: uuid('company_id').references(() => company.id),
    type: varchar('type', { length: 32 }), // weekly_report, performance_review, etc.
    shareToken: varchar('share_token', { length: 64 }), // null if not shared
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
      relations: {
        company: {
          fields: [table.companyId],
          references: [company.id],
        },
        user: {
          fields: [table.userId],
          references: [user.id],
        },
      },
    };
  }
);
```

The `type` can technically be anything, but lets use 'weekly_report', 'monthly_report', 'custom_report' for now. So the table of Reports should show the title and type, as well as the updatedAt ("Last Edited") in "3 hours ago" format.

We should have filters above the table to filter Documents by type, company, and timeframe (last week, last 30 days, last 12 months, all time).

Each Document should have a trashcan button to delete it, that shows a Dialog first. There should not be any document viewing or editing capability at the moment.

## New Report pages

Each of the toolbar buttons on the Reports Page goes to a new url, like /reports/new/weekly, /reports/new/monthly, /reports/new/custom, which has a pre-filled prompt that will be submitted but may be modified, and also a list of the Achievements that will be used to generate the document.

I think the UI for each of those /reports/new/ urls should be the same, with the only difference being the pre-filled prompt and the date range used to select the Achievements. The Achievements table presented should also have filters to allow the user to filter down to certain companies or projects. Each Achievement should have a checkbox, with a checkbox in the table header to select all. They should all be selected by default.

There should be a button that generates the document. This is probably a multi-second process, so it should communicate to the user that it's in progress. When it's done, it should go back to the /reports page.
<END-PROMPT>

That's the end of the prompt I gave Vercel v0.

Please start your plan. Write it to PLAN.md in this same directory.
