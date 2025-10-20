Task: Remove all mentions of votes and suggestions from apps/web

## Specific Requirements

Remove the vote and suggestion tables and any foreign keys linked from other tables to them in schema.ts (packages/database). Look through the rest of the codebase for any code that relates to votes or suggestions at all. There are likely some queries in packages/database that can be deleted, and possible some API endpoints, and possibly some UI code too.

Explicitly do not generate migrations or try to migrate the database; I will do that myself. Just make the required edits to schema.ts.
