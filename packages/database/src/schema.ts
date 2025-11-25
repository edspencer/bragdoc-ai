import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  jsonb,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
  pgEnum,
  time,
  date,
  smallint,
  vector,
  real,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export interface UserPreferences {
  language: string;
  documentInstructions?: string;
}

export interface AppUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  modelId?: string;
}

export const userLevelEnum = pgEnum('user_level', [
  'free',
  'basic',
  'pro',
  'demo',
]);
export type UserLevel = (typeof userLevelEnum.enumValues)[number];

export const renewalPeriodEnum = pgEnum('renewal_period', [
  'monthly',
  'yearly',
]);
export type RenewalPeriod = (typeof renewalPeriodEnum.enumValues)[number];

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'banned',
  'deleted',
]);

export const sourceTypeEnum = pgEnum('source_type', ['git', 'github', 'jira']);
export type SourceType = (typeof sourceTypeEnum.enumValues)[number];

export const user = pgTable(
  'User',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    email: varchar('email', { length: 64 }).notNull(),
    password: varchar('password', { length: 255 }), // Increased for Better Auth bcrypt hashes
    name: varchar('name', { length: 256 }),
    image: varchar('image', { length: 512 }),
    provider: varchar('provider', { length: 32 })
      .notNull()
      .default('credentials'),
    providerId: varchar('provider_id', { length: 256 }),
    preferences: jsonb('preferences')
      .$type<UserPreferences>()
      .notNull()
      .default({
        language: 'en',
        documentInstructions: '',
      }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    emailVerified: boolean('email_verified').notNull().default(false), // Changed to boolean for Better Auth

    level: userLevelEnum('level').notNull().default('free'),
    renewalPeriod: renewalPeriodEnum('renewal_period')
      .notNull()
      .default('monthly'),
    lastPayment: timestamp('last_payment'),

    status: userStatusEnum('status').notNull().default('active'),
    stripeCustomerId: varchar('stripe_customer_id', { length: 256 }),
    tosAcceptedAt: timestamp('tos_accepted_at'),
  },
  (table) => ({
    // Critical for login/registration queries
    emailIdx: index('user_email_idx').on(table.email),
  }),
);

export type User = InferSelectModel<typeof user>;

export const userMessage = pgTable('UserMessage', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  originalText: text('original_text').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type UserMessage = InferSelectModel<typeof userMessage>;

export const company = pgTable(
  'Company',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 256 }).notNull(),
    domain: varchar('domain', { length: 256 }),
    role: varchar('role', { length: 256 }).notNull(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date'),
  },
  (table) => ({
    // Index for company listings/dropdowns
    userIdIdx: index('company_user_id_idx').on(table.userId),
  }),
);

export type Company = InferSelectModel<typeof company>;

export enum ProjectStatus {
  Active = 'active',
  Completed = 'completed',
  Archived = 'archived',
}

export const project = pgTable(
  'Project',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),
    companyId: uuid('company_id').references(() => company.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 256 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    color: varchar('color', { length: 7 }).notNull().default('#3B82F6'),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date'),
    repoRemoteUrl: varchar('repo_remote_url', { length: 256 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Index for project listings/dropdowns
    userIdIdx: index('project_user_id_idx').on(table.userId),
  }),
);

export type Project = InferSelectModel<typeof project>;

export const source = pgTable(
  'Source',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 256 }).notNull(),
    type: sourceTypeEnum('type').notNull(),
    config: jsonb('config').$type<Record<string, any>>(),
    isArchived: boolean('is_archived').default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('source_user_id_idx').on(table.userId),
    projectIdIdx: index('source_project_id_idx').on(table.projectId),
    userProjectIdIdx: index('source_user_project_id_idx').on(
      table.userId,
      table.projectId,
    ),
    userIdArchivedIdx: index('source_user_id_archived_idx').on(
      table.userId,
      table.isArchived,
    ),
  }),
);

export type Source = InferSelectModel<typeof source>;

export const achievement = pgTable(
  'Achievement',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),
    companyId: uuid('company_id').references(() => company.id, {
      onDelete: 'set null',
    }),
    projectId: uuid('project_id').references(() => project.id),
    sourceId: uuid('source_id').references(() => source.id, {
      onDelete: 'set null',
    }),
    uniqueSourceId: varchar('unique_source_id', { length: 512 }),
    standupDocumentId: uuid('standup_document_id').references(
      () => standupDocument.id,
      { onDelete: 'set null' },
    ),
    userMessageId: uuid('user_message_id').references(() => userMessage.id),
    title: varchar('title', { length: 256 }).notNull(),
    summary: text('summary'),
    details: text('details'),
    eventStart: timestamp('event_start'),
    eventEnd: timestamp('event_end'),
    eventDuration: varchar('event_duration', {
      enum: ['day', 'week', 'month', 'quarter', 'half year', 'year'],
    }).notNull(),
    isArchived: boolean('is_archived').default(false),
    source: varchar('source', { enum: ['llm', 'manual', 'commit'] })
      .notNull()
      .default('manual'),
    impact: integer('impact').default(2),
    impactSource: varchar('impact_source', { enum: ['user', 'llm'] }).default(
      'llm',
    ),
    impactUpdatedAt: timestamp('impact_updated_at').defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),

    // Workstream assignment
    workstreamId: uuid('workstream_id').references(() => workstream.id, {
      onDelete: 'set null',
    }),
    workstreamSource: varchar('workstream_source', { length: 16 }), // 'ai' | 'user'

    // Embedding storage
    embedding: vector('embedding', { dimensions: 1536 }),
    embeddingModel: varchar('embedding_model', { length: 64 }).default(
      'text-embedding-3-small',
    ),
    embeddingGeneratedAt: timestamp('embedding_generated_at'),
  },
  (table) => ({
    // Performance indexes for workstreams feature
    // Composite index for common query pattern: userId + eventStart filtering
    userEventStartIdx: index('achievement_user_event_start_idx').on(
      table.userId,
      table.eventStart,
    ),
    // Index for workstream filtering and joins
    workstreamIdIdx: index('achievement_workstream_id_idx').on(
      table.workstreamId,
    ),
    // Individual index for user-scoped queries
    userIdIdx: index('achievement_user_id_idx').on(table.userId),
    // Index for date range queries
    eventStartIdx: index('achievement_event_start_idx').on(table.eventStart),
    // Indexes for source-based queries
    userSourceIdx: index('achievement_user_source_idx').on(
      table.userId,
      table.sourceId,
    ),
    userSourceUniqueIdx: index('achievement_user_source_unique_idx').on(
      table.userId,
      table.sourceId,
      table.uniqueSourceId,
    ),
    // Partial unique constraint to prevent duplicate achievements within a project
    // Only applies when both projectId and uniqueSourceId are NOT NULL
    // This allows manual achievements without these fields to coexist
    achievementProjectSourceUnique: uniqueIndex(
      'achievement_project_source_unique',
    )
      .on(table.projectId, table.uniqueSourceId)
      .where(
        sql`${table.projectId} IS NOT NULL AND ${table.uniqueSourceId} IS NOT NULL`,
      ),
  }),
);

export type Achievement = InferSelectModel<typeof achievement>;

export const workstream = pgTable(
  'Workstream',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Core fields
    name: varchar('name', { length: 256 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 7 }).default('#3B82F6'),

    // Centroid caching for fast incremental assignment
    centroidEmbedding: vector('centroid_embedding', { dimensions: 1536 }),
    centroidUpdatedAt: timestamp('centroid_updated_at'),

    // Metadata
    achievementCount: integer('achievement_count').default(0),
    isArchived: boolean('is_archived').default(false),

    // Auditing
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Performance indexes for workstreams queries
    // Individual index for user-scoped queries
    userIdIdx: index('workstream_user_id_idx').on(table.userId),
    // Composite index for filtering active/archived workstreams by user
    userArchivedIdx: index('workstream_user_archived_idx').on(
      table.userId,
      table.isArchived,
    ),
  }),
);

export type Workstream = InferSelectModel<typeof workstream>;

export const workstreamMetadata = pgTable('WorkstreamMetadata', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
    .unique(), // One metadata record per user

  // Clustering history
  lastFullClusteringAt: timestamp('last_full_clustering_at').notNull(),
  achievementCountAtLastClustering: integer(
    'achievement_count_at_last_clustering',
  ).notNull(),

  // Clustering parameters used
  epsilon: real('epsilon').notNull(),
  minPts: integer('min_pts').notNull(),

  // Statistics
  workstreamCount: integer('workstream_count').default(0),
  outlierCount: integer('outlier_count').default(0),

  // Filter parameters from last clustering
  generationParams: jsonb('generation_params')
    .$type<{
      timeRange?: { startDate: string; endDate: string };
      projectIds?: string[];
    }>()
    .notNull()
    .default({}),

  // Count of achievements in filtered set at time of clustering
  filteredAchievementCount: integer('filtered_achievement_count')
    .notNull()
    .default(0),

  // Auditing
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type WorkstreamMetadata = InferSelectModel<typeof workstreamMetadata>;

export const chat = pgTable(
  'Chat',
  {
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
  },
  (table) => ({
    // Index for chat listings
    userIdIdx: index('chat_user_id_idx').on(table.userId),
  }),
);

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable(
  'Message',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    role: varchar('role').notNull(),
    parts: json('parts').notNull(),
    attachments: json('attachments').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    // Critical index for message listings in chats
    chatIdIdx: index('message_chat_id_idx').on(table.chatId),
  }),
);

export type Message = InferSelectModel<typeof message>;

export const document = pgTable(
  'Document',
  {
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
    companyId: uuid('company_id').references(() => company.id, {
      onDelete: 'set null',
    }),
    type: varchar('type', { length: 32 }), // weekly_report, performance_review, etc.
    shareToken: varchar('share_token', { length: 64 }), // null if not shared
    chatId: uuid('chat_id').references(() => chat.id),
  },
  (table) => ({
    // Index for document listings
    userIdIdx: index('document_user_id_idx').on(table.userId),
    // Index for public share link lookups
    shareTokenIdx: index('document_share_token_idx').on(table.shareToken),
  }),
);

export type Document = InferSelectModel<typeof document>;

// Document with joined company data
export interface DocumentWithCompany extends Document {
  companyName: string | null;
}

export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;

export const standup = pgTable(
  'Standup',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    name: text('name').notNull(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    companyId: uuid('companyId').references(() => company.id, {
      onDelete: 'set null',
    }),
    projectIds: uuid('project_ids').array(),

    // Content
    description: text('description'),
    instructions: text('instructions'),

    // Scheduling
    daysMask: smallint('days_mask').notNull(), // 7 bits (Mon..Sun). Must be 1..127
    meetingTime: time('meeting_time', { withTimezone: false }).notNull(), // local clock time
    timezone: varchar('timezone', { length: 64 }).notNull(), // e.g. "America/New_York"
    startDate: date('start_date').notNull().defaultNow(),
    enabled: boolean('enabled').notNull().default(true),

    // Auditing
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    // Index for standup listings
    userIdIdx: index('standup_user_id_idx').on(table.userId),
  }),
);

export type Standup = InferSelectModel<typeof standup>;

export const standupDocument = pgTable(
  'StandupDocument',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    standupId: uuid('standupId')
      .notNull()
      .references(() => standup.id),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),

    summary: text('summary'), // AI-generated 1-line summary
    date: timestamp('date').notNull(),
    wip: text('wip'),
    achievementsSummary: text('achievements_summary'),
    wipSource: varchar('wip_source', { enum: ['manual', 'llm'] }).default(
      'llm',
    ),
    achievementsSummarySource: varchar('achievements_summary_source', {
      enum: ['manual', 'llm'],
    }).default('llm'),
  },
  (table) => ({
    // Index for fetching standup documents by standup
    standupIdIdx: index('standup_document_standup_id_idx').on(table.standupId),
    // Index for date range queries
    dateIdx: index('standup_document_date_idx').on(table.date),
  }),
);

export type StandupDocument = InferSelectModel<typeof standupDocument>;

// Better Auth Account table
export const account = pgTable(
  'Account',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: varchar('accountId', { length: 255 }).notNull(),
    providerId: varchar('providerId', { length: 255 }).notNull(),
    refreshToken: text('refreshToken'),
    accessToken: text('accessToken'),
    accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
    refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
    scope: varchar('scope', { length: 255 }),
    idToken: text('idToken'),
    password: varchar('password', { length: 255 }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    // Index for account lookups
    userIdIdx: index('account_user_id_idx').on(table.userId),
    // Composite index for OAuth provider lookups during login
    providerIdx: index('account_provider_idx').on(
      table.providerId,
      table.accountId,
    ),
  }),
);

// Better Auth Session table
export const session = pgTable(
  'Session',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expiresAt').notNull(),
    ipAddress: varchar('ipAddress', { length: 45 }),
    userAgent: text('userAgent'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    // Critical index for session validation on every authenticated request
    userIdIdx: index('session_user_id_idx').on(table.userId),
  }),
);

// Better Auth VerificationToken table
export const verification = pgTable('verification', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
export type Account = InferSelectModel<typeof account>;
export type Session = InferSelectModel<typeof session>;
export type Verification = InferSelectModel<typeof verification>;

export const emailPreferences = pgTable('email_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => user.id)
    .notNull(),
  unsubscribedAt: timestamp('unsubscribed_at'),
  // Specific email types they've unsubscribed from (null means unsubscribed from all)
  emailTypes: text('email_types').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type EmailPreferences = InferSelectModel<typeof emailPreferences>;
