# Database Layer

## Overview

BragDoc uses PostgreSQL with Drizzle ORM for type-safe database access. The database layer is centralized in the `@bragdoc/database` package and shared across the web application and CLI tool.

## Database Stack

- **Database**: PostgreSQL 14+
- **ORM**: Drizzle ORM v0.34.1
- **Connection**: Neon Serverless (@neondatabase/serverless) or Vercel Postgres
- **Migrations**: SQL-based migrations via Drizzle Kit
- **Type Safety**: InferSelectModel for compile-time type checking

## Design Principles

### 1. Type Safety
Every database operation is fully typed using Drizzle's type inference:

```typescript
import type { InferSelectModel } from 'drizzle-orm';
import { user } from './schema';

export type User = InferSelectModel<typeof user>;
// User type automatically inferred from schema
```

### 2. Security by Default
All queries **MUST** be scoped by `userId` to prevent unauthorized access:

```typescript
// ✅ CORRECT - Always scope by userId
const achievements = await db
  .select()
  .from(achievement)
  .where(eq(achievement.userId, userId));

// ❌ WRONG - Missing userId scope (security vulnerability)
const achievements = await db.select().from(achievement);
```

### 3. Consistent Patterns
- **UUID Primary Keys**: All tables use `uuid().primaryKey().defaultRandom()`
- **Timestamps**: `createdAt`, `updatedAt` on all tables
- **Soft Deletes**: `isArchived` boolean where applicable
- **Cascade Deletes**: Foreign keys with `onDelete: 'cascade'` or `'set null'`

## Schema Architecture

### File: `packages/database/src/schema.ts`

## Core Tables

### User Table
**Purpose**: User accounts and authentication

```typescript
export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),         // nullable (OAuth users)
  name: varchar('name', { length: 256 }),
  image: varchar('image', { length: 512 }),
  provider: varchar('provider', { length: 32 })          // 'credentials', 'google', 'github'
    .notNull()
    .default('credentials'),
  providerId: varchar('provider_id', { length: 256 }),   // OAuth provider user ID
  githubAccessToken: varchar('github_access_token', { length: 256 }),
  preferences: jsonb('preferences')                       // UserPreferences type
    .$type<UserPreferences>()
    .notNull()
    .default({
      hasSeenWelcome: false,
      language: 'en',
      documentInstructions: '',
    }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  emailVerified: timestamp('email_verified').defaultNow(),

  // Subscription fields
  level: userLevelEnum('level').notNull().default('free'),           // 'free', 'basic', 'pro', 'demo'
  renewalPeriod: renewalPeriodEnum('renewal_period')                 // 'monthly', 'yearly'
    .notNull()
    .default('monthly'),
  lastPayment: timestamp('last_payment'),
  status: userStatusEnum('status').notNull().default('active'),      // 'active', 'banned', 'deleted'
  stripeCustomerId: varchar('stripe_customer_id', { length: 256 }),
});
```

**Enums:**
```typescript
export const userLevelEnum = pgEnum('user_level', ['free', 'basic', 'pro', 'demo']);
export const renewalPeriodEnum = pgEnum('renewal_period', ['monthly', 'yearly']);
export const userStatusEnum = pgEnum('user_status', ['active', 'banned', 'deleted']);
```

**Type Definitions:**
```typescript
export interface UserPreferences {
  hasSeenWelcome: boolean;
  language: string;
  documentInstructions?: string;
}

export type User = InferSelectModel<typeof user>;
export type UserLevel = (typeof userLevelEnum.enumValues)[number];
```

---

### Company Table
**Purpose**: Employers and organizations

```typescript
export const company = pgTable('Company', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),    // Delete company when user deleted
  name: varchar('name', { length: 256 }).notNull(),
  domain: varchar('domain', { length: 256 }),               // e.g., 'acme.com'
  role: varchar('role', { length: 256 }).notNull(),         // e.g., 'Senior Engineer'
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),                            // null if current employer
});
```

**Related Functions:**
- `getCompaniesByUserId()` - Ordered by startDate DESC
- `getCompanyById()` - With userId scope
- `createCompany()`
- `updateCompany()`
- `deleteCompany()`
- `deleteCompanyWithCascade()` - Custom cascade delete logic
- `getCompanyRelatedDataCounts()` - Count related records

---

### Project Table
**Purpose**: Development projects (Git repositories)

```typescript
export const project = pgTable('Project', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),                             // No cascade (preserve on user delete)
  companyId: uuid('company_id')
    .references(() => company.id, { onDelete: 'set null' }), // Nullify if company deleted
  name: varchar('name', { length: 256 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 32 })
    .notNull()
    .default('active'),                                      // 'active', 'completed', 'archived'
  color: varchar('color', { length: 7 })
    .notNull()
    .default('#3B82F6'),                                     // Hex color for UI
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),                            // null if ongoing
  repoRemoteUrl: varchar('repo_remote_url', { length: 256 }), // Git remote URL
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Enum:**
```typescript
export enum ProjectStatus {
  Active = 'active',
  Completed = 'completed',
  Archived = 'archived',
}
```

**Query Pattern:**
Projects are linked to CLI config via `repoRemoteUrl`. When CLI extracts achievements, it matches the remote URL to find the `projectId`.

---

### Achievement Table
**Purpose**: Individual accomplishments

```typescript
export const achievement = pgTable('Achievement', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  companyId: uuid('company_id')
    .references(() => company.id, { onDelete: 'set null' }),
  projectId: uuid('project_id')
    .references(() => project.id),                          // No cascade (preserve data)
  standupDocumentId: uuid('standup_document_id')
    .references(() => standupDocument.id, { onDelete: 'set null' }),
  userMessageId: uuid('user_message_id')
    .references(() => userMessage.id),                      // Original chat message (if any)

  // Core fields
  title: varchar('title', { length: 256 }).notNull(),
  summary: text('summary'),
  details: text('details'),

  // Time tracking
  eventStart: timestamp('event_start'),
  eventEnd: timestamp('event_end'),
  eventDuration: varchar('event_duration', {
    enum: ['day', 'week', 'month', 'quarter', 'half year', 'year']
  }).notNull(),

  // Metadata
  isArchived: boolean('is_archived').default(false),
  source: varchar('source', { enum: ['llm', 'manual', 'commit'] })
    .notNull()
    .default('manual'),
  impact: integer('impact').default(2),                     // 1-10 scale
  impactSource: varchar('impact_source', { enum: ['user', 'llm'] })
    .default('llm'),
  impactUpdatedAt: timestamp('impact_updated_at').defaultNow(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Source Types:**
- `llm`: Extracted by AI from Git commits or chat
- `manual`: Created manually by user in web app
- `commit`: Specifically from Git commit extraction (CLI)

**Impact Scale:**
- 1-10 integer representing significance of achievement
- Source tracked separately (`user` or `llm`)
- Updated timestamp for tracking when impact was last modified

---

### Standup Table
**Purpose**: Recurring standup meeting configurations

```typescript
export const standup = pgTable('Standup', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: text('name').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  companyId: uuid('companyId')
    .references(() => company.id, { onDelete: 'set null' }),
  projectIds: uuid('project_ids').array(),                  // Array of project UUIDs

  // Content
  description: text('description'),
  instructions: text('instructions'),                        // Custom AI instructions

  // Scheduling
  daysMask: smallint('days_mask').notNull(),                // 7 bits (Mon=1, Sun=64). Range: 1-127
  meetingTime: time('meeting_time', { withTimezone: false }).notNull(), // e.g., '09:30:00'
  timezone: varchar('timezone', { length: 64 }).notNull(),  // e.g., 'America/New_York'
  startDate: date('start_date').notNull().defaultNow(),
  enabled: boolean('enabled').notNull().default(true),

  // Auditing
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
```

**Days Mask Encoding:**
```
Bit 0 (1):   Monday
Bit 1 (2):   Tuesday
Bit 2 (4):   Wednesday
Bit 3 (8):   Thursday
Bit 4 (16):  Friday
Bit 5 (32):  Saturday
Bit 6 (64):  Sunday

Examples:
- Mon-Fri: 31 (1+2+4+8+16)
- Mon/Wed/Fri: 21 (1+4+16)
- Daily: 127 (all bits set)
```

---

### StandupDocument Table
**Purpose**: Prepared standup notes for specific dates

```typescript
export const standupDocument = pgTable('StandupDocument', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  standupId: uuid('standupId')
    .notNull()
    .references(() => standup.id),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),

  summary: text('summary'),                                 // AI-generated one-line summary
  date: timestamp('date').notNull(),                        // Date this standup is for
  wip: text('wip'),                                         // Work-in-progress section
  achievementsSummary: text('achievements_summary'),        // Achievements section
  wipSource: varchar('wip_source', { enum: ['manual', 'llm'] }).default('llm'),
  achievementsSummarySource: varchar('achievements_summary_source', {
    enum: ['manual', 'llm']
  }).default('llm'),
});
```

**Relationship:**
- Achievements can reference a `standupDocumentId`
- Allows tracking which achievements were included in which standup
- CLI command `bragdoc standup wip` generates these documents

---

### Document Table
**Purpose**: Generated documents (reports, reviews, etc.)

```typescript
export const document = pgTable('Document', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  title: text('title').notNull(),
  content: text('content'),
  kind: varchar('kind', { enum: ['text', 'code', 'image', 'sheet'] })
    .notNull()
    .default('text'),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  companyId: uuid('company_id')
    .references(() => company.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 32 }),                    // 'weekly_report', 'performance_review', etc.
  shareToken: varchar('share_token', { length: 64 }),       // UUID for public sharing (nullable)
  chatId: uuid('chat_id')
    .references(() => chat.id),                             // If generated from chat
});
```

**Sharing:**
- When `shareToken` is null, document is private
- When set, document accessible at `/share/{shareToken}`
- No authentication required for shared links

---

### Chat & Message Tables
**Purpose**: Chat history for AI assistant

```typescript
export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
  lastContext: jsonb('lastContext').$type<AppUsage | null>(),
});

export const message = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),                          // 'user', 'assistant', 'system'
  parts: json('parts').notNull(),                           // Message parts (text, images, etc.)
  attachments: json('attachments').notNull(),               // File attachments
  createdAt: timestamp('createdAt').notNull(),
});
```

**AppUsage Type:**
```typescript
export interface AppUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  modelId?: string;
}
```

---

### UserMessage Table
**Purpose**: Store original user input for traceability

```typescript
export const userMessage = pgTable('UserMessage', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  originalText: text('original_text').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

**Use Case:**
When user creates achievements via chat, the original message is stored and linked via `achievement.userMessageId`.

---

## NextAuth Tables

Required tables for NextAuth.js JWT authentication:

### Account Table
```typescript
export const account = pgTable('Account', {
  userId: uuid('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: varchar('token_type', { length: 255 }),
  scope: varchar('scope', { length: 255 }),
  id_token: text('id_token'),
  session_state: varchar('session_state', { length: 255 }),
}, (table) => ({
  pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
}));
```

### Session Table
```typescript
export const session = pgTable('Session', {
  sessionToken: varchar('sessionToken', { length: 255 }).primaryKey(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});
```

### VerificationToken Table
```typescript
export const verificationToken = pgTable('VerificationToken', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.identifier, table.token] }),
}));
```

---

## GitHub Integration Tables (Future)

### GitHubRepository Table
```typescript
export const githubRepository = pgTable('GitHubRepository', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  name: varchar('name', { length: 256 }).notNull(),
  fullName: varchar('full_name', { length: 512 }).notNull(),
  description: text('description'),
  private: boolean('private').notNull().default(false),
  lastSynced: timestamp('last_synced'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### GitHubPullRequest Table
```typescript
export const githubPullRequest = pgTable('GitHubPullRequest', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  repositoryId: uuid('repository_id')
    .notNull()
    .references(() => githubRepository.id),
  prNumber: integer('pr_number').notNull(),
  title: varchar('title', { length: 512 }).notNull(),
  description: text('description'),
  state: varchar('state', { length: 32 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  mergedAt: timestamp('merged_at'),
  achievementId: uuid('achievement_id')
    .references(() => achievement.id),
}, (table) => ({
  repoAndPrUnique: uniqueIndex('repo_pr_unique').on(
    table.repositoryId,
    table.prNumber,
  ),
}));
```

---

## Query Patterns

### File: `packages/database/src/queries.ts`

### Basic Query Pattern
```typescript
export async function getAchievementsByUserId({
  userId,
  limit = 50,
  offset = 0,
}: {
  userId: string;
  limit?: number;
  offset?: number;
}, dbInstance = defaultDb): Promise<Achievement[]> {
  return await dbInstance
    .select()
    .from(achievement)
    .where(eq(achievement.userId, userId))              // ALWAYS scope by userId
    .orderBy(desc(achievement.createdAt))
    .limit(limit)
    .offset(offset);
}
```

**Key Points:**
- Always accept `dbInstance` parameter (defaults to `defaultDb`)
- Enables dependency injection for testing
- Consistent error handling with try/catch
- Always log errors with context

### Complex Query with Joins
```typescript
export async function getAchievements({
  userId,
  companyId,
  projectId,
  limit = 10,
  offset = 0,
  db = defaultDb,
}) {
  const conditions = [eq(achievement.userId, userId)];

  if (companyId) conditions.push(eq(achievement.companyId, companyId));
  if (projectId) conditions.push(eq(achievement.projectId, projectId));

  const achievements = await db
    .select({
      id: achievement.id,
      title: achievement.title,
      // ... all achievement fields
      company: {
        id: company.id,
        name: company.name,
        // ... company fields
      },
      project: {
        id: project.id,
        name: project.name,
        // ... project fields
      },
    })
    .from(achievement)
    .leftJoin(company, eq(achievement.companyId, company.id))
    .leftJoin(project, eq(achievement.projectId, project.id))
    .where(and(...conditions))
    .limit(limit)
    .offset(offset)
    .orderBy(desc(achievement.eventStart));

  // Also get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(achievement)
    .where(and(...conditions));

  return {
    achievements,
    total: Number(countResult[0]?.count ?? 0),
  };
}
```

### Update Pattern
```typescript
export async function updateAchievement({
  id,
  userId,
  data,
  db = defaultDb,
}): Promise<Achievement[]> {
  // Filter undefined values
  const updateData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  return await db
    .update(achievement)
    .set({
      ...updateData,
      updatedAt: new Date(),                          // Always update timestamp
    })
    .where(and(
      eq(achievement.id, id),
      eq(achievement.userId, userId)                  // Security: verify ownership
    ))
    .returning();
}
```

### Delete Pattern
```typescript
export async function deleteAchievement({
  id,
  userId,
  db = defaultDb,
}): Promise<Achievement[]> {
  return await db
    .delete(achievement)
    .where(and(
      eq(achievement.id, id),
      eq(achievement.userId, userId)                  // Security: verify ownership
    ))
    .returning();
}
```

### Aggregation Queries
```typescript
export async function getAchievementStats({ userId, db = defaultDb }) {
  const [totalStatsResult] = await db
    .select({
      totalAchievements: sql<number>`count(*)`,
      totalImpact: sql<number>`coalesce(sum(${achievement.impact}), 0)`,
    })
    .from(achievement)
    .where(and(
      eq(achievement.userId, userId),
      eq(achievement.isArchived, false)
    ));

  const totalAchievements = Number(totalStatsResult?.totalAchievements ?? 0);
  const totalImpactPoints = Number(totalStatsResult?.totalImpact ?? 0);

  return {
    totalAchievements,
    totalImpactPoints,
    avgImpactPerAchievement: totalAchievements > 0
      ? totalImpactPoints / totalAchievements
      : 0,
  };
}
```

### Date Range Queries
```typescript
export async function generatePeriodSummary({
  userId,
  startDate,
  endDate,
  db = defaultDb,
}): Promise<Achievement[]> {
  return await db
    .select()
    .from(achievement)
    .where(and(
      eq(achievement.userId, userId),
      gte(achievement.eventStart, startDate),
      lte(achievement.eventEnd, endDate),
    ))
    .orderBy(asc(achievement.eventStart));
}
```

### Cascade Delete with Custom Logic
```typescript
export async function deleteCompanyWithCascade({
  id,
  userId,
  cascadeOptions,
  db = defaultDb,
}) {
  // Verify ownership
  const companyData = await getCompanyById({ id, userId, db });
  if (!companyData) throw new Error('Company not found');

  const deletedCounts = { projects: 0, achievements: 0, documents: 0, standups: 0 };

  // Conditionally delete related records
  if (cascadeOptions.deleteProjects) {
    const deletedProjects = await db
      .delete(project)
      .where(and(eq(project.companyId, id), eq(project.userId, userId)))
      .returning();
    deletedCounts.projects = deletedProjects.length;
  }

  // ... similar for achievements, documents, standups

  // Finally delete the company
  const [deletedCompany] = await db
    .delete(company)
    .where(and(eq(company.id, id), eq(company.userId, userId)))
    .returning();

  return { company: deletedCompany, deletedCounts };
}
```

---

## Drizzle ORM Usage

### Operators
```typescript
import { eq, ne, gt, gte, lt, lte, and, or, not, inArray, between, like, sql } from 'drizzle-orm';

// Equality
.where(eq(user.id, userId))
.where(ne(achievement.isArchived, true))

// Comparison
.where(gte(achievement.impact, 5))
.where(lt(achievement.createdAt, someDate))

// Logical
.where(and(eq(user.id, userId), eq(achievement.isArchived, false)))
.where(or(eq(project.status, 'active'), eq(project.status, 'completed')))

// Array
.where(inArray(achievement.id, [id1, id2, id3]))

// Range
.where(between(achievement.eventStart, startDate, endDate))

// Pattern matching
.where(like(company.name, '%Acme%'))

// Raw SQL (when needed)
.where(sql`${achievement.impact} > ${threshold}`)
```

### Ordering
```typescript
import { asc, desc } from 'drizzle-orm';

.orderBy(desc(achievement.createdAt))
.orderBy(asc(company.name), desc(company.startDate))
```

### Pagination
```typescript
const limit = 10;
const offset = (page - 1) * limit;

const results = await db
  .select()
  .from(achievement)
  .where(eq(achievement.userId, userId))
  .limit(limit)
  .offset(offset);
```

### Joins
```typescript
// Left join (optional relation)
.leftJoin(company, eq(achievement.companyId, company.id))

// Inner join (required relation)
.innerJoin(company, eq(achievement.companyId, company.id))

// Multiple joins
.leftJoin(company, eq(achievement.companyId, company.id))
.leftJoin(project, eq(achievement.projectId, project.id))
```

---

## Migrations

### Workflow

1. **Modify Schema**
   ```typescript
   // packages/database/src/schema.ts
   export const newTable = pgTable('NewTable', {
     id: uuid('id').primaryKey().defaultRandom(),
     // ... fields
   });
   ```

2. **Generate Migration**
   ```bash
   cd /Users/ed/Code/brag-ai
   pnpm db:generate
   ```

   This creates a new file in `packages/database/src/migrations/`:
   ```
   0010_new_feature.sql
   ```

3. **Review Migration**
   ```sql
   -- packages/database/src/migrations/0010_new_feature.sql
   CREATE TABLE "NewTable" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
     ...
   );
   ```

4. **Apply Migration**
   ```bash
   pnpm db:push
   ```

   Or programmatically:
   ```bash
   pnpm db:migrate
   ```

5. **Commit to Version Control**
   ```bash
   git add packages/database/src/migrations/
   git commit -m "feat: add NewTable migration"
   ```

### Migration Best Practices

- **Never edit existing migrations** after they've been applied
- **Always review generated SQL** before applying
- **Use transactions** for multi-step migrations
- **Add indexes** for frequently queried columns
- **Test migrations** on dev database first
- **Backup production** before applying migrations

### Example Migration File
```sql
-- 0010_add_github_integration.sql
CREATE TABLE "GitHubRepository" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" varchar(256) NOT NULL,
  "full_name" varchar(512) NOT NULL,
  "private" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "github_repo_user_idx" ON "GitHubRepository"("user_id");
CREATE INDEX "github_repo_full_name_idx" ON "GitHubRepository"("full_name");
```

---

## Database Connection

### Configuration

**Environment Variables:**
```env
POSTGRES_URL=postgresql://user:pass@host:5432/dbname
# OR
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

**Connection File** (`packages/database/src/index.ts`):
```typescript
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.POSTGRES_URL!);
export const db = drizzle(sql);
```

### Connection Pooling

Neon serverless handles connection pooling automatically:
- No need for explicit pool configuration
- Connections are managed at the edge
- Suitable for serverless/edge runtimes
- Automatic scaling based on load

### Alternative: Vercel Postgres
```typescript
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';

export const db = drizzle(sql);
```

---

## Type Safety Examples

### Inferred Types
```typescript
import type { InferSelectModel } from 'drizzle-orm';
import { achievement, company, project } from './schema';

// Automatically inferred from schema
export type Achievement = InferSelectModel<typeof achievement>;
export type Company = InferSelectModel<typeof company>;
export type Project = InferSelectModel<typeof project>;

// Types are fully typed
const a: Achievement = {
  id: '...',
  userId: '...',
  title: 'Built feature X',
  // TypeScript ensures all required fields are present
};
```

### Custom Composite Types
```typescript
export type AchievementWithRelations = Achievement & {
  company: Company | null;
  project: Project | null;
  userMessage: UserMessage | null;
};

// Use in queries
const achievements: AchievementWithRelations[] = await db
  .select({
    ...achievementFields,
    company: companyFields,
    project: projectFields,
  })
  .from(achievement)
  .leftJoin(...)
```

### Insert Types
```typescript
import type { InferInsertModel } from 'drizzle-orm';

export type NewAchievement = InferInsertModel<typeof achievement>;

// Or pick specific fields
export type CreateAchievementInput = Omit<
  typeof achievement.$inferInsert,
  'id' | 'createdAt' | 'updatedAt'
>;
```

---

## Security Best Practices

### 1. Always Scope by userId
```typescript
// ✅ CORRECT
const achievements = await db
  .select()
  .from(achievement)
  .where(eq(achievement.userId, userId));

// ❌ WRONG - Exposes all users' data
const achievements = await db.select().from(achievement);
```

### 2. Verify Ownership on Updates/Deletes
```typescript
// ✅ CORRECT
await db
  .delete(achievement)
  .where(and(
    eq(achievement.id, id),
    eq(achievement.userId, userId)      // Prevents deleting other users' data
  ));

// ❌ WRONG - Could delete any achievement
await db.delete(achievement).where(eq(achievement.id, id));
```

### 3. Use Transactions for Multi-Step Operations
```typescript
// ✅ CORRECT
await db.transaction(async (tx) => {
  await tx.insert(project).values({...});
  await tx.insert(achievement).values({...});
});

// ❌ WRONG - Risk of partial failure
await db.insert(project).values({...});
await db.insert(achievement).values({...});  // Could fail leaving orphaned project
```

### 4. Validate Input Before Database Operations
```typescript
import { z } from 'zod';

const createAchievementSchema = z.object({
  title: z.string().min(1).max(256),
  impact: z.number().int().min(1).max(10),
});

// ✅ CORRECT
const validatedData = createAchievementSchema.parse(input);
await createAchievement(validatedData);

// ❌ WRONG - Unvalidated input
await createAchievement(input);
```

### 5. Use Parameterized Queries (Built-in)
Drizzle automatically uses parameterized queries, preventing SQL injection:
```typescript
// Safe - Drizzle parameterizes automatically
.where(eq(user.email, userInput))

// Equivalent to:
// SELECT * FROM "User" WHERE email = $1
// With parameters: [userInput]
```

---

## Performance Considerations

### Indexing
```sql
-- Primary keys are automatically indexed
CREATE INDEX "achievement_user_id_idx" ON "Achievement"("user_id");
CREATE INDEX "achievement_created_at_idx" ON "Achievement"("created_at");
CREATE INDEX "achievement_event_start_idx" ON "Achievement"("event_start");
```

### Query Optimization
```typescript
// Use select() to limit fields
const achievements = await db
  .select({
    id: achievement.id,
    title: achievement.title,
    // Only select needed fields
  })
  .from(achievement);

// Use limit/offset for large result sets
.limit(10).offset(0);

// Use proper ordering
.orderBy(desc(achievement.createdAt));
```

### Connection Efficiency
- Neon serverless handles pooling
- No need to manually close connections
- Edge-compatible for low latency

---

**Last Updated**: 2025-10-21
**Schema Version**: See latest migration number
**Drizzle Version**: 0.34.1
