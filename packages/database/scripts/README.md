# Database Scripts

## mark-baseline-migrations.sh

This script is used in CI to handle Neon schema-only branches properly.

### Problem

When using Neon's schema-only branching feature:
1. The branch gets the complete database schema from the parent
2. The `__drizzle_migrations` table exists but is **empty**
3. Drizzle sees an empty migrations table and tries to run ALL migrations from scratch
4. This fails because the schema already exists (e.g., "type renewal_period already exists")

### Solution

The script automatically identifies which migrations were present in the parent branch (the "baseline") and marks them as already applied in the `__drizzle_migrations` table. This allows Drizzle to only run new migrations that were added in the current branch.

### How It Works

1. **Finds the merge base**: Uses `git merge-base HEAD main` to find where the current branch diverged from main
2. **Reads baseline migrations**: Gets the migration journal from that commit to see which migrations existed then
3. **Marks them as applied**: Inserts those migrations into `__drizzle_migrations` with `ON CONFLICT DO NOTHING`
4. **Runs remaining migrations**: Drizzle's `migrate()` function then only runs new migrations

### Usage

```bash
# In CI (automatically via workflow)
POSTGRES_URL="postgresql://..." packages/database/scripts/mark-baseline-migrations.sh

# Or via npm script
POSTGRES_URL="postgresql://..." pnpm --filter=@bragdoc/database db:mark-baseline
```

### Requirements

- `POSTGRES_URL` environment variable must be set
- `psql` must be available
- `jq` must be available
- Must be run from a git repository

### Example

If the current branch diverged from main when there were 2 migrations (0000 and 0001), and the current branch adds migration 0002:

1. Script finds merge base and reads journal → finds migrations 0000, 0001
2. Script marks 0000, 0001 as applied in `__drizzle_migrations`
3. Drizzle's `migrate()` sees 0000, 0001 are done, only runs 0002

This is **dynamic** and **maintenance-free** - it automatically adapts to however many migrations exist in the parent branch.
