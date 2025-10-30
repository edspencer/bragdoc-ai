# @bragdoc/database

Shared database layer for BragDoc using Drizzle ORM and PostgreSQL.

## Overview

This package provides:
- **Schema Definitions**: Type-safe database schema using Drizzle ORM
- **Query Functions**: Reusable, type-safe query operations
- **Migrations**: Version-controlled SQL migrations
- **Type Exports**: Shared types for use across applications

## Installation

This is an internal workspace package. Install dependencies from the repository root:

```bash
pnpm install
```

## Usage

### Importing the Database

```typescript
import { db } from '@bragdoc/database';
import { user, achievement, project } from '@bragdoc/database';

// Query the database
const users = await db.select().from(user);
```

### Using Query Functions

```typescript
import { getAchievementsByUserId, createAchievement } from '@bragdoc/database';

// Get achievements for a user
const achievements = await getAchievementsByUserId({
  userId: 'user-123',
  limit: 10
});

// Create new achievement
const newAchievement = await createAchievement({
  userId: 'user-123',
  title: 'Shipped major feature',
  summary: 'Delivered authentication system',
  eventStart: new Date(),
  eventDuration: 'week'
});
```

### Type Safety

```typescript
import type { User, Achievement, Project } from '@bragdoc/database';

// Types are automatically inferred from schema
const user: User = {
  id: 'uuid',
  email: 'user@example.com',
  name: 'John Doe',
  // ... TypeScript enforces all required fields
};
```

## Database Schema

See [schema.ts](./src/schema.ts) for complete schema definition.

**Core Tables:**
- `User` - User accounts and authentication
- `Achievement` - Individual accomplishments
- `Project` - Development projects (linked to Git repos)
- `Company` - Employers/organizations
- `Document` - Generated documents (reports, reviews)
- `Chat` / `Message` - AI chat history
- `Standup` / `StandupDocument` - Standup meeting tracking

**Design Patterns:**
- UUID primary keys with `.defaultRandom()`
- Timestamps (`createdAt`, `updatedAt`) with `.defaultNow()`
- Soft deletes via `isArchived` boolean flags
- Foreign keys with cascade delete or set null
- **All queries scoped by userId for security**

## Migration Workflow

BragDoc uses a **migration-based workflow** for database schema changes.

### Making Schema Changes

**1. Update Schema**

Edit `src/schema.ts`:

```typescript
export const newTable = pgTable('NewTable', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 256 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

**2. Generate Migration**

```bash
pnpm db:generate
```

This creates a new SQL file in `src/migrations/` (e.g., `0001_add_new_table.sql`).

**3. Review Migration**

Always review the generated SQL to ensure it matches your intent:

```bash
cat src/migrations/0001_*.sql
```

**4. Test Locally**

```bash
pnpm db:migrate
```

This applies the migration to your local database using `POSTGRES_URL`.

**5. Commit Migration Files**

```bash
git add src/schema.ts src/migrations/
git commit -m "feat(db): add NewTable for feature X"
```

**6. Deploy**

Push to GitHub. Vercel automatically runs migrations during the build process.

### Available Scripts

```bash
# Generate migration from schema changes
pnpm db:generate

# Run migrations programmatically
pnpm db:migrate

# Open Drizzle Studio (visual database browser)
pnpm db:studio

# Push schema directly (DEVELOPMENT ONLY - see warning below)
pnpm db:push
```

### ⚠️ Critical Warning: db:push

**NEVER use `pnpm db:push` with production credentials.**

| Command | Use Case | Safety | Production |
|---------|----------|--------|------------|
| `pnpm db:migrate` | Apply version-controlled migrations | ✅ Safe | ✅ Use this |
| `pnpm db:push` | Sync schema directly (bypasses migrations) | ⚠️ Dangerous | ❌ NEVER |

**Why `db:push` is dangerous:**
- Bypasses migration history (no rollback capability)
- Can cause data loss (drops columns immediately)
- No version control or audit trail
- Breaks automated deployment

**When to use `db:push`:**
- ✅ Local development with disposable data
- ✅ Prototyping new features quickly
- ❌ NEVER with production database
- ❌ NEVER with preview/staging databases

## Development vs Production

### Local Development

```env
# .env.local
POSTGRES_URL=postgresql://localhost:5432/bragdoc_dev
```

Use either workflow:
- **Migration-based** (recommended): `db:generate` → `db:migrate`
- **Direct push** (quick prototyping): `db:push`

### Production/Staging

```env
# Vercel environment variables
POSTGRES_URL=postgresql://user:pass@prod.neon.tech/bragdoc
```

**Always use migration-based workflow:**
1. Generate migration: `pnpm db:generate`
2. Test locally: `pnpm db:migrate`
3. Commit files
4. Deploy (migrations run automatically via `vercel-build` script)

## Environment Variables

### Required

```env
POSTGRES_URL=postgresql://user:password@host:5432/database
```

### Alternative Variable Names

The package also checks these alternative names (for compatibility):
- `DATABASE_URL`
- `POSTGRES_URL`

Use `POSTGRES_URL` for consistency across the project.

## Database Connection

### Neon Serverless (Default)

```typescript
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.POSTGRES_URL!);
export const db = drizzle(sql);
```

**Features:**
- Serverless-optimized (works in edge runtimes)
- Automatic connection pooling
- Low latency via HTTP
- Compatible with Cloudflare Workers

### Alternative: Vercel Postgres

```typescript
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';

export const db = drizzle(sql);
```

## Security Best Practices

### Always Scope by userId

```typescript
// ✅ CORRECT - Always scope by userId
const achievements = await db
  .select()
  .from(achievement)
  .where(eq(achievement.userId, userId));

// ❌ WRONG - Missing userId scope (security vulnerability)
const achievements = await db.select().from(achievement);
```

### Verify Ownership on Updates/Deletes

```typescript
// ✅ CORRECT - Verify ownership
await db
  .delete(achievement)
  .where(and(
    eq(achievement.id, achievementId),
    eq(achievement.userId, userId)  // Prevents deleting other users' data
  ));

// ❌ WRONG - No ownership check
await db.delete(achievement).where(eq(achievement.id, achievementId));
```

### Use Transactions for Multi-Step Operations

```typescript
// ✅ CORRECT - Use transaction
await db.transaction(async (tx) => {
  await tx.insert(project).values({...});
  await tx.insert(achievement).values({...});
});

// ❌ WRONG - Risk of partial failure
await db.insert(project).values({...});
await db.insert(achievement).values({...});  // Could fail, leaving orphaned project
```

## Troubleshooting

### "Cannot connect to database"

**Cause**: `POSTGRES_URL` environment variable not set

**Solution**:
```bash
# Check environment variable
echo $POSTGRES_URL

# Set it if missing
export POSTGRES_URL="postgresql://..."
```

### "Migration already applied"

**Cause**: Trying to rerun a migration

**Solution**: This is normal. Drizzle automatically skips already-applied migrations.

### "Relation already exists"

**Cause**: Database has schema but migration history not tracked

**Solution**: See baseline migration reset procedure in [MIGRATION-RESET.md](./MIGRATION-RESET.md)

## Documentation

- **Schema Documentation**: [../../.claude/docs/tech/database.md](../../.claude/docs/tech/database.md)
- **Migration Guide**: [../../docs/DATABASE-MIGRATIONS.md](../../docs/DATABASE-MIGRATIONS.md)
- **Migration Reset**: [MIGRATION-RESET.md](./MIGRATION-RESET.md)
- **Deployment**: [../../.claude/docs/tech/deployment.md](../../.claude/docs/tech/deployment.md)

## Contributing

When making schema changes:

1. **Update schema.ts** with new tables/columns
2. **Generate migration** with `pnpm db:generate`
3. **Review SQL** to ensure correctness
4. **Test locally** with `pnpm db:migrate`
5. **Add tests** if adding new query functions
6. **Update documentation** if changing patterns
7. **Commit together** (schema + migration files)

## License

MIT
