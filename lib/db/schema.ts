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
  boolean,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export interface UserPreferences {
  hasSeenWelcome: boolean;
  language: string;
}

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
  name: varchar('name', { length: 256 }),
  image: varchar('image', { length: 512 }),
  provider: varchar('provider', { length: 32 }).notNull().default('credentials'),
  providerId: varchar('provider_id', { length: 256 }),
  githubAccessToken: varchar('github_access_token', { length: 256 }),
  preferences: jsonb('preferences').$type<UserPreferences>().notNull().default({
    hasSeenWelcome: false,
    language: 'en'
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  emailVerified: timestamp('email_verified').defaultNow(),

  level: varchar('level', { enum: ['free', 'basic', 'pro'] }).notNull().default('free'),
  renewalPeriod: varchar('renewal_period', { enum: ['monthly', 'yearly'] }).notNull().default('monthly'),
  lastPayment: timestamp('last_payment'),

  status: varchar('status', { enum: ['active', 'banned', 'deleted'] }).notNull().default('active'),
});

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

export const company = pgTable('Company', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 256 }).notNull(),
  domain: varchar('domain', { length: 256 }),
  role: varchar('role', { length: 256 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
});

export type Company = InferSelectModel<typeof company>;

export enum ProjectStatus {
  Active = 'active',
  Completed = 'completed',
  Archived = 'archived'
}

export const project = pgTable('Project', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  companyId: uuid('company_id')
    .references(() => company.id),
  name: varchar('name', { length: 256 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Project = InferSelectModel<typeof project>;

export const achievement = pgTable('Achievement', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id),
  companyId: uuid('company_id')
    .references(() => company.id),
  projectId: uuid('project_id')
    .references(() => project.id),
  userMessageId: uuid('user_message_id')
    .references(() => userMessage.id),
  title: varchar('title', { length: 256 }).notNull(),
  summary: text('summary'),
  details: text('details'),
  eventStart: timestamp('event_start'),
  eventEnd: timestamp('event_end'),
  eventDuration: varchar('event_duration', { 
    enum: ['day', 'week', 'month', 'quarter', 'half year', 'year'] 
  }).notNull(),
  isArchived: boolean('is_archived').default(false),
  source: varchar('source', { enum: ['llm', 'manual'] }).notNull().default('manual'),
  impact: integer('impact').default(2),
  impactSource: varchar('impact_source', { enum: ['user', 'llm'] }).default('llm'),
  impactUpdatedAt: timestamp('impact_updated_at').defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    relations: {
      company: { fields: [table.companyId], references: [company.id] },
      project: { fields: [table.projectId], references: [project.id] },
      userMessage: { fields: [table.userMessageId], references: [userMessage.id] },
    },
  };
});

export type Achievement = InferSelectModel<typeof achievement>;

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
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type Message = InferSelectModel<typeof message>;

export const vote = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    companyId: uuid('company_id')
      .references(() => company.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.documentId, table.documentCreatedAt] }),
    };
  },
);

export type Suggestion = InferSelectModel<typeof suggestion>;

// GitHub Integration Tables
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

export type GitHubRepository = InferSelectModel<typeof githubRepository>;

export const githubPullRequest = pgTable(
  'GitHubPullRequest',
  {
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
  },
  (table) => ({
    repoAndPrUnique: uniqueIndex('repo_pr_unique').on(table.repositoryId, table.prNumber),
  }),
);

export type GitHubPullRequest = InferSelectModel<typeof githubPullRequest>;

// NextAuth.js required tables
export const account = pgTable(
  'Account',
  {
    userId: uuid('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 255 })
      .notNull(),
    provider: varchar('provider', { length: 255 })
      .notNull(),
    providerAccountId: varchar('providerAccountId', { length: 255 })
      .notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: varchar('token_type', { length: 255 }),
    scope: varchar('scope', { length: 255 }),
    id_token: text('id_token'),
    session_state: varchar('session_state', { length: 255 }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  })
);

export const session = pgTable('Session', {
  sessionToken: varchar('sessionToken', { length: 255 }).primaryKey(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationToken = pgTable(
  'VerificationToken',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  })
);

export type Account = InferSelectModel<typeof account>;
export type Session = InferSelectModel<typeof session>;
export type VerificationToken = InferSelectModel<typeof verificationToken>;