CREATE TYPE "public"."renewal_period" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."user_level" AS ENUM('free', 'basic', 'pro', 'demo');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'banned', 'deleted');--> statement-breakpoint
CREATE TABLE "Account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"accountId" varchar(255) NOT NULL,
	"providerId" varchar(255) NOT NULL,
	"refreshToken" text,
	"accessToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" varchar(255),
	"idToken" text,
	"password" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Achievement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid,
	"project_id" uuid,
	"standup_document_id" uuid,
	"user_message_id" uuid,
	"title" varchar(256) NOT NULL,
	"summary" text,
	"details" text,
	"event_start" timestamp,
	"event_end" timestamp,
	"event_duration" varchar NOT NULL,
	"is_archived" boolean DEFAULT false,
	"source" varchar DEFAULT 'manual' NOT NULL,
	"impact" integer DEFAULT 2,
	"impact_source" varchar DEFAULT 'llm',
	"impact_updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp NOT NULL,
	"title" text NOT NULL,
	"userId" uuid NOT NULL,
	"visibility" varchar DEFAULT 'private' NOT NULL,
	"lastContext" jsonb
);
--> statement-breakpoint
CREATE TABLE "Company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"domain" varchar(256),
	"role" varchar(256) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "Document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"kind" varchar DEFAULT 'text' NOT NULL,
	"userId" uuid NOT NULL,
	"company_id" uuid,
	"type" varchar(32),
	"share_token" varchar(64),
	"chat_id" uuid
);
--> statement-breakpoint
CREATE TABLE "email_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"unsubscribed_at" timestamp,
	"email_types" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "GitHubPullRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"pr_number" integer NOT NULL,
	"title" varchar(512) NOT NULL,
	"description" text,
	"state" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"merged_at" timestamp,
	"achievement_id" uuid
);
--> statement-breakpoint
CREATE TABLE "GitHubRepository" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"full_name" varchar(512) NOT NULL,
	"description" text,
	"private" boolean DEFAULT false NOT NULL,
	"last_synced" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"role" varchar NOT NULL,
	"parts" json NOT NULL,
	"attachments" json NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid,
	"name" varchar(256) NOT NULL,
	"description" text,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"color" varchar(7) DEFAULT '#3B82F6' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"repo_remote_url" varchar(256),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" varchar(45),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "Standup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"userId" uuid NOT NULL,
	"companyId" uuid,
	"project_ids" uuid[],
	"description" text,
	"instructions" text,
	"days_mask" smallint NOT NULL,
	"meeting_time" time NOT NULL,
	"timezone" varchar(64) NOT NULL,
	"start_date" date DEFAULT now() NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "StandupDocument" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"standupId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"summary" text,
	"date" timestamp NOT NULL,
	"wip" text,
	"achievements_summary" text,
	"wip_source" varchar DEFAULT 'llm',
	"achievements_summary_source" varchar DEFAULT 'llm'
);
--> statement-breakpoint
CREATE TABLE "Stream" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"createdAt" timestamp NOT NULL,
	CONSTRAINT "Stream_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(64) NOT NULL,
	"password" varchar(255),
	"name" varchar(256),
	"image" varchar(512),
	"provider" varchar(32) DEFAULT 'credentials' NOT NULL,
	"provider_id" varchar(256),
	"github_access_token" varchar(256),
	"preferences" jsonb DEFAULT '{"language":"en","documentInstructions":""}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"level" "user_level" DEFAULT 'free' NOT NULL,
	"renewal_period" "renewal_period" DEFAULT 'monthly' NOT NULL,
	"last_payment" timestamp,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"stripe_customer_id" varchar(256),
	"tos_accepted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "UserMessage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"original_text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_company_id_Company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."Company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_project_id_Project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."Project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_standup_document_id_StandupDocument_id_fk" FOREIGN KEY ("standup_document_id") REFERENCES "public"."StandupDocument"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_user_message_id_UserMessage_id_fk" FOREIGN KEY ("user_message_id") REFERENCES "public"."UserMessage"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Company" ADD CONSTRAINT "Company_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_company_id_Company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."Company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Document" ADD CONSTRAINT "Document_chat_id_Chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "GitHubPullRequest" ADD CONSTRAINT "GitHubPullRequest_repository_id_GitHubRepository_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."GitHubRepository"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "GitHubPullRequest" ADD CONSTRAINT "GitHubPullRequest_achievement_id_Achievement_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."Achievement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "GitHubRepository" ADD CONSTRAINT "GitHubRepository_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Project" ADD CONSTRAINT "Project_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Project" ADD CONSTRAINT "Project_company_id_Company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."Company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Standup" ADD CONSTRAINT "Standup_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Standup" ADD CONSTRAINT "Standup_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "StandupDocument" ADD CONSTRAINT "StandupDocument_standupId_Standup_id_fk" FOREIGN KEY ("standupId") REFERENCES "public"."Standup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "StandupDocument" ADD CONSTRAINT "StandupDocument_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserMessage" ADD CONSTRAINT "UserMessage_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "repo_pr_unique" ON "GitHubPullRequest" USING btree ("repository_id","pr_number");