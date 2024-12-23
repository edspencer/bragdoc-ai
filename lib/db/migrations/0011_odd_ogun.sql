ALTER TABLE "Brag" RENAME TO "Achievement";--> statement-breakpoint
ALTER TABLE "GitHubPullRequest" RENAME COLUMN "brag_id" TO "achievement_id";--> statement-breakpoint
ALTER TABLE "Achievement" DROP CONSTRAINT "Brag_user_id_User_id_fk";
--> statement-breakpoint
ALTER TABLE "Achievement" DROP CONSTRAINT "Brag_company_id_Company_id_fk";
--> statement-breakpoint
ALTER TABLE "Achievement" DROP CONSTRAINT "Brag_project_id_Project_id_fk";
--> statement-breakpoint
ALTER TABLE "Achievement" DROP CONSTRAINT "Brag_user_message_id_UserMessage_id_fk";
--> statement-breakpoint
ALTER TABLE "GitHubPullRequest" DROP CONSTRAINT "GitHubPullRequest_brag_id_Brag_id_fk";
--> statement-breakpoint
ALTER TABLE "Achievement" ALTER COLUMN "user_message_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Achievement" ADD COLUMN "source" varchar DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "Achievement" ADD COLUMN "impact" integer DEFAULT 2;--> statement-breakpoint
ALTER TABLE "Achievement" ADD COLUMN "impact_source" varchar DEFAULT 'llm';--> statement-breakpoint
ALTER TABLE "Achievement" ADD COLUMN "impact_updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "preferences" jsonb DEFAULT '{"hasSeenWelcome":false,"language":"en"}'::jsonb NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_company_id_Company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."Company"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_project_id_Project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."Project"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_user_message_id_UserMessage_id_fk" FOREIGN KEY ("user_message_id") REFERENCES "public"."UserMessage"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "GitHubPullRequest" ADD CONSTRAINT "GitHubPullRequest_achievement_id_Achievement_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."Achievement"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
