CREATE TYPE "public"."source_item_type" AS ENUM('commit', 'pr', 'issue', 'pr_comment');--> statement-breakpoint
DROP INDEX "achievement_project_source_unique";--> statement-breakpoint
ALTER TABLE "Achievement" ADD COLUMN "source_item_type" "source_item_type";--> statement-breakpoint
-- Backfill existing records: set source_item_type = 'commit' where unique_source_id looks like a commit SHA (40 hex chars)
UPDATE "Achievement"
SET source_item_type = 'commit'
WHERE unique_source_id IS NOT NULL
AND unique_source_id ~ '^[a-f0-9]{40}$';--> statement-breakpoint
CREATE UNIQUE INDEX "achievement_project_source_unique" ON "Achievement" USING btree ("project_id","source_item_type","unique_source_id") WHERE "Achievement"."project_id" IS NOT NULL AND "Achievement"."source_item_type" IS NOT NULL AND "Achievement"."unique_source_id" IS NOT NULL;