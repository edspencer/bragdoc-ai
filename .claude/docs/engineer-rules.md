# Rules for Engineers working on Bragdoc

## Additional code style rules

- Never use dynamic imports. If there is truly no other way, advise me and get my explicit permission before doing this
- page.tsx files should never be "use client" client components, they should always be server-rendered React Server Components

## Databases

We're not currently using drizzle migrations, so in order to make schema changes during development we do this:

cd packages/database
pnpm db:generate
pnpm db:push
pnpm test:setup

Production database will be pushed to once we're ready to deploy, and is not something you should ever attempt to do.
