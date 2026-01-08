# Database Layer

## Overview

BragDoc uses PostgreSQL with Drizzle ORM for type-safe database access. The database layer is centralized in the `@bragdoc/database` package and shared across the web application and CLI tool.

## Database Stack

- **Database**: PostgreSQL 14+ with pgvector extension
- **ORM**: Drizzle ORM v0.34.1
- **Vector Storage**: pgvector for embedding storage (1536-dimensional vectors)
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

### Source Table
**Purpose**: Track integration instances (Git, GitHub, Jira) configured by users, associated with specific projects

```typescript
export const sourceTypeEnum = pgEnum('source_type', ['git', 'github', 'jira']);
export type SourceType = (typeof sourceTypeEnum.enumValues)[number];

export const sourceItemTypeEnum = pgEnum('source_item_type', [
  'commit',      // Git commit or GitHub commit
  'pr',          // GitHub pull request
  'issue',       // GitHub issue
  'pr_comment',  // GitHub PR review comment (future)
]);
export type SourceItemType = (typeof sourceItemTypeEnum.enumValues)[number];

export const source = pgTable('Source', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => project.id, { onDelete: 'cascade' }),  // Associate source with project
  name: varchar('name', { length: 256 }).notNull(),         // Display name (e.g., 'Personal Repo')
  type: sourceTypeEnum('type').notNull(),                   // 'git', 'github', or 'jira'
  config: jsonb('config').$type<Record<string, any>>(),     // Source-type-specific config
  isArchived: boolean('is_archived').default(false),        // Soft delete
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('source_user_id_idx').on(table.userId),
  projectIdIdx: index('source_project_id_idx').on(table.projectId),
  userProjectIdIdx: index('source_user_project_id_idx').on(table.userId, table.projectId),
  userIdArchivedIdx: index('source_user_id_archived_idx').on(table.userId, table.isArchived),
}));

export type Source = InferSelectModel<typeof source>;
```

**Type Definition:**
```typescript
export type Source = {
  id: string;
  userId: string;
  projectId: string;  // New: Links source to specific project
  name: string;
  type: SourceType;
  config: Record<string, any> | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};
```

**Field Documentation:**
- **projectId**: UUID foreign key to Project table with CASCADE delete. Every source must belong to exactly one project. When a project is deleted, all its sources are deleted.
- **Indexes**:
  - `source_project_id_idx`: Single column index on projectId for fast filtering by project
  - `source_user_project_id_idx`: Composite index on (userId, projectId) for security-scoped project queries
  - `source_user_id_archived_idx`: Composite index on (userId, isArchived) for listing active sources

**Use Case:**
Sources enable multi-integration support within a project. For example, for a single project, a user might configure:
- One Git source for a local repository
- One GitHub source for the same repository on GitHub
- One Jira source for related issue tracking

Sources are always scoped to both userId (security) and projectId (organization). When the CLI extracts achievements, it fetches sources for a specific project, initializes the appropriate connector for each source, and combines data from all sources before creating achievements.

**Query Pattern:**
```typescript
// Get all sources for a project
const sources = await db
  .select()
  .from(source)
  .where(and(
    eq(source.userId, userId),      // Security scope
    eq(source.projectId, projectId), // Project scope
    eq(source.isArchived, false)     // Exclude archived
  ));
```

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
  sourceId: uuid('source_id')
    .references(() => source.id, { onDelete: 'set null' }), // Multi-source support
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
  uniqueSourceId: varchar('unique_source_id', { length: 512 }), // Idempotent deduplication
  sourceItemType: sourceItemTypeEnum('source_item_type'),       // Type of source item (commit, pr, issue)

  // Workstream fields
  workstreamId: uuid('workstream_id')
    .references(() => workstream.id, { onDelete: 'set null' }),
  workstreamSource: varchar('workstream_source', { length: 16 }), // 'ai' | 'user'

  // Embedding fields for AI workstream clustering
  embedding: vector('embedding', { dimensions: 1536 }),     // OpenAI text-embedding-3-small
  embeddingModel: varchar('embedding_model', { length: 64 })
    .default('text-embedding-3-small'),
  embeddingGeneratedAt: timestamp('embedding_generated_at'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userSourceIdx: index('achievement_user_source_idx').on(table.userId, table.sourceId),
  userSourceUniqueIdx: index('achievement_user_source_unique_idx').on(
    table.userId,
    table.sourceId,
    table.uniqueSourceId
  ),
  // Partial unique index: prevents duplicate imports of same item type from same project
  achievementProjectSourceUnique: uniqueIndex('achievement_project_source_unique')
    .on(table.projectId, table.sourceItemType, table.uniqueSourceId)
    .where(sql`project_id IS NOT NULL AND source_item_type IS NOT NULL AND unique_source_id IS NOT NULL`),
}));
```

**Source Tracking Fields:**
- **sourceId**: Foreign key linking achievement to its source. Set to `null` when source is archived to preserve the achievement.
- **uniqueSourceId**: Source-specific identifier (e.g., Git commit hash `abc123def...`, PR number `456`, issue number `789`) enabling idempotent imports. Prevents duplicates when re-importing from the same source with the same reference.
- **sourceItemType**: Distinguishes the type of source item (`commit`, `pr`, `issue`, `pr_comment`). Works with the unique constraint to allow the same ID number to exist for different item types (e.g., PR #123 and Issue #123 are distinct).

**Source Linking Examples:**
```typescript
// Find all achievements from a specific source
const { achievements, total } = await getAchievementsBySourceId(
  userId,
  sourceId,
  { limit: 50 }
);

// Check if achievement was already imported (idempotent)
const existing = await findAchievementByUniqueSourceId(
  userId,
  sourceId,
  'git:abc123def456' // Source-specific ID
);
if (!existing) {
  // Safe to create new achievement
}
```

**Achievement Source** (how the achievement was created):
- `'commit'`: Achievements extracted from Git commits via the CLI tool. These are automatically extracted from commit messages and repository history.
- `'manual'`: Achievements created directly by users through the web application UI.
- `'llm'`: Achievements generated by LLM. Currently not actively used for creation, but supported by the schema for potential future AI-generated achievements.

**Impact Source** (how the impact score was calculated - distinct from achievement source):
- `'user'`: Impact score was manually set by the user
- `'llm'`: Impact score was estimated by AI during extraction

**Key Distinction**: The `source` field indicates *where the achievement came from* (extraction method), while `impactSource` indicates *how the impact score was estimated*. For example, a CLI-extracted achievement has `source='commit'` (extracted from a commit) but typically `impactSource='llm'` (impact was estimated by the LLM during extraction).

**Impact Scale:**
- 1-10 integer representing significance of achievement
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

**Type Definition with Company Join:**

Similar to `ProjectWithCompany`, we have a type for documents with joined company data:

```typescript
// packages/database/src/schema.ts
export type Document = InferSelectModel<typeof document>;

export interface DocumentWithCompany extends Document {
  companyName: string | null;
}
```

**Usage Example:**

```typescript
// apps/web/app/(app)/reports/[id]/page.tsx
import type { DocumentWithCompany } from '@bragdoc/database';

// Query with left join to company table
const documentData = await db
  .select({
    id: document.id,
    title: document.title,
    content: document.content,
    type: document.type,
    kind: document.kind,
    chatId: document.chatId,
    companyId: document.companyId,
    userId: document.userId,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    shareToken: document.shareToken,
    company: {
      id: company.id,
      name: company.name,
    },
  })
  .from(document)
  .leftJoin(company, eq(document.companyId, company.id))
  .where(and(eq(document.id, id), eq(document.userId, userId)));

// Transform to DocumentWithCompany type
const doc: DocumentWithCompany = {
  ...documentData[0],
  companyName: documentData[0].company?.name || null,
};
```

---

### PerformanceReview Table
**Purpose**: Persistent performance review configurations with date ranges and custom instructions

The `PerformanceReview` table stores user-defined review periods for generating performance review documents. Each review has a name, date range (`startDate`, `endDate`), and optional custom instructions for AI generation. The generated document is linked via `documentId` (nullable, set to null on document deletion) allowing the review to persist independently.

**Key Fields:** `id` (UUID), `userId` (FK with cascade delete), `name`, `startDate`, `endDate`, `instructions` (nullable), `documentId` (FK to Document, set null on delete), timestamps. Indexed on `userId`.

**Query Functions:** `getPerformanceReviewsByUserId()`, `getPerformanceReviewById()`, `createPerformanceReview()`, `updatePerformanceReview()`, `deletePerformanceReview()` - all in `packages/database/src/performance-reviews/queries.ts`.

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

---

### Workstream Table
**Purpose**: Semantic groupings of related achievements across projects

```typescript
export const workstream = pgTable('Workstream', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  // Core fields
  name: varchar('name', { length: 256 }).notNull(),          // LLM-generated descriptive name
  description: text('description'),                           // LLM-generated summary
  color: varchar('color', { length: 7 }).default('#3B82F6'), // Hex color for UI

  // Centroid caching for fast incremental assignment
  centroidEmbedding: vector('centroid_embedding', { dimensions: 1536 }),
  centroidUpdatedAt: timestamp('centroid_updated_at'),

  // Metadata
  achievementCount: integer('achievement_count').default(0),
  isArchived: boolean('is_archived').default(false),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Purpose**: Workstreams automatically group semantically related achievements using ML clustering. They help users identify patterns and themes in their work across different projects and time periods.

---

### WorkstreamMetadata Table
**Purpose**: Clustering history and parameters for workstream generation

```typescript
export const workstreamMetadata = pgTable('WorkstreamMetadata', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
    .unique(),  // One metadata record per user

  // Clustering history
  lastFullClusteringAt: timestamp('last_full_clustering_at').notNull(),
  achievementCountAtLastClustering: integer('achievement_count_at_last_clustering').notNull(),

  // Clustering parameters used
  epsilon: real('epsilon').notNull(),          // DBSCAN distance threshold
  minPts: integer('min_pts').notNull(),        // DBSCAN minimum points

  // Generation parameters and filtering (NEW)
  generationParams: jsonb('generation_params')  // Stores filter parameters from clustering
    .$type<{
      timeRange?: { startDate: string; endDate: string };
      projectIds?: string[];
    }>()
    .notNull()
    .default({}),
  filteredAchievementCount: integer('filtered_achievement_count') // Count of achievements in filtered set
    .notNull()
    .default(0),

  // Statistics
  workstreamCount: integer('workstream_count').default(0),
  outlierCount: integer('outlier_count').default(0),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**Field Documentation:**
- **generationParams**: JSON object storing filter parameters (timeRange and projectIds) used during clustering. Enables intelligent re-clustering detection when filters change from previous clustering operations.
- **filteredAchievementCount**: Integer count of achievements in the filtered set at time of last clustering. Used for growth calculations in re-clustering decision logic instead of total achievement count (more accurate when users apply filters).

**Re-clustering Triggers**: Full re-clustering occurs when:
- Never clustered before (no metadata record)
- Filter parameters changed from previous clustering (timeRange or projectIds differ)
- Achievement count in filtered set increased by 10% since last clustering
- Achievement count in filtered set increased by 50+ since last clustering
- More than 30 days since last clustering

---

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

**Month-over-Month Proration:** The `getAchievementStats` function prorates current month impact for fair comparison against previous full months. The formula projects current pace across the full month: `thisMonthImpact * (totalDaysInMonth / currentDayOfMonth)`. On day 1, actual values are used to avoid extreme 28-31x projections. This ensures growth percentages accurately reflect user performance rather than penalizing users for incomplete months.

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

### Achievement Date Range Query

For fetching achievements within a specific date range with project/company context:

```typescript
const achievements = await getAchievementsByDateRange(
  userId,
  startDate,
  endDate,
);
```

Returns achievements ordered chronologically with `projectName` and `companyName` via LEFT JOINs. Used for performance review generation to provide context-rich achievement data.

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

BragDoc uses a **migration-based workflow** with Drizzle ORM for safe, version-controlled database schema changes.

### Migration Architecture

**Key Components:**

1. **Schema Definition**: `packages/database/src/schema.ts` (single source of truth)
2. **Migration Files**: `packages/database/src/migrations/*.sql` (version-controlled SQL)
3. **Migration Metadata**: `packages/database/src/migrations/meta/_journal.json` (Drizzle tracking)
4. **Migration Runner**: `packages/database/src/migrate.ts` (automated execution)
5. **Tracking Table**: `drizzle.__drizzle_migrations` (applied migrations log)

**Automated Deployment**: Migrations run automatically during Vercel builds via `vercel-build` script hook.

### Migration Workflow

**1. Modify Schema**
   ```typescript
   // packages/database/src/schema.ts
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

   This creates a new numbered migration file:
   ```
   packages/database/src/migrations/0001_feature_name.sql
   ```

**3. Review Migration SQL**
   ```sql
   -- packages/database/src/migrations/0001_add_new_table.sql
   CREATE TABLE "NewTable" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
     "user_id" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
     "name" varchar(256) NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL
   );

   CREATE INDEX "new_table_user_idx" ON "NewTable"("user_id");
   ```

   **Always review the generated SQL** to ensure it matches your intent and doesn't contain destructive changes.

**4. Test Migration Locally**
   ```bash
   pnpm db:migrate
   ```

   This runs `packages/database/src/migrate.ts` which:
   - Connects to your local database using `POSTGRES_URL`
   - Applies any pending migrations in order
   - Updates `drizzle.__drizzle_migrations` tracking table

**5. Commit Migration Files**
   ```bash
   git add packages/database/src/schema.ts
   git add packages/database/src/migrations/
   git commit -m "feat(db): add NewTable for feature X"
   ```

   **Critical**: Always commit both schema changes and generated migration files together.

**6. Deploy**
   Push to GitHub, and Vercel automatically:
   - Runs `vercel-build` script (includes `pnpm db:migrate`)
   - Applies pending migrations before building app
   - Deploys updated code with migrated schema

### Database Commands

```bash
# Generate migration from schema changes
pnpm db:generate

# Run migrations programmatically (recommended for production)
pnpm db:migrate

# Open Drizzle Studio (database GUI)
pnpm db:studio

# Push schema directly (DEVELOPMENT ONLY - see warning below)
pnpm db:push
```

### ⚠️ Critical Warning: db:push vs db:migrate

**NEVER use `db:push` with production credentials.**

| Command | Use Case | Safety | Production |
|---------|----------|--------|------------|
| `pnpm db:migrate` | Apply version-controlled migrations | ✅ Safe | ✅ Use this |
| `pnpm db:push` | Sync schema directly (bypasses migrations) | ⚠️ Dangerous | ❌ NEVER |

**Why `db:push` is dangerous:**
- Bypasses migration history (no rollback)
- Can cause data loss (drops columns immediately)
- No version control or audit trail
- Breaks deployment automation

**When to use `db:push`:**
- ✅ Local development prototyping (with local database)
- ✅ Quick schema experimentation (disposable data)
- ❌ NEVER with production database
- ❌ NEVER with preview/staging databases

### Baseline Migration Reset

**Context**: If you have an existing database with the complete schema but no migration history, you need to mark the baseline migration as applied without re-running it.

**When needed:**
- Existing production database before migration system implementation
- Database created with `db:push` before switching to migrations

**Procedure** (see `packages/database/MIGRATION-RESET.md` for complete guide):

```sql
-- 1. Check migration tracking table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
);

-- 2. Get baseline migration hash from meta/_journal.json
-- (Replace HASH_VALUE with actual hash from _journal.json)

-- 3. Mark baseline as applied
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('HASH_VALUE', EXTRACT(EPOCH FROM NOW()) * 1000);

-- 4. Verify
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

**Important**: This is a one-time operation. Future migrations will run normally via `pnpm db:migrate`.

### Migration Best Practices

#### Schema Changes
- **Never edit existing migrations** after they've been applied to any database
- **Always review generated SQL** before committing
- **Test migrations locally** before deploying
- **Use transactions** for multi-step data migrations
- **Add indexes** for frequently queried columns
- **Use descriptive migration names** (Drizzle generates from schema changes)

#### Data Migrations
- **Separate DDL and DML**: Create table first, then populate data in separate migration
- **Handle NULL values**: Set defaults or update existing rows before adding NOT NULL constraint
- **Batch large updates**: For performance on large tables
- **Test rollback**: Ensure you can revert if needed

#### Deployment
- **Migrations run before build**: Vercel executes migrations during build phase
- **POSTGRES_URL required at build time**: Set as Vercel environment variable (both Build + Runtime)
- **Monitor build logs**: Check migration execution in Vercel deployment logs
- **Database backups**: Always backup before major schema changes

#### Rollback
If a migration fails or causes issues:
1. **Revert code**: Deploy previous working version
2. **Create reverse migration**: Generate new migration to undo changes
3. **Manual intervention**: Last resort - requires database access and SQL expertise

### Example Migration File

```sql
-- 0001_add_new_table.sql
CREATE TABLE "NewTable" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" varchar(256) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "new_table_user_idx" ON "NewTable"("user_id");
```

### Troubleshooting

**Migration fails with "relation already exists":**
- Schema exists but not tracked in migration history
- Solution: Use baseline migration reset procedure (see above)

**Migration fails with "column does not exist":**
- Migration order issue or partial migration application
- Solution: Check `drizzle.__drizzle_migrations` to see which migrations have been applied

**Vercel build fails during migration:**
- Check `POSTGRES_URL` is set as build-time environment variable
- Review Vercel build logs for specific SQL error
- Verify migration SQL is valid

**See Also:**
- Complete migration guide: `docs/DATABASE-MIGRATIONS.md`
- Reset procedure: `packages/database/MIGRATION-RESET.md`
- Deployment integration: `.claude/docs/tech/deployment.md`

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

**Last Updated**: 2025-11-26
**Schema Version**: See latest migration number
**Drizzle Version**: 0.34.1
