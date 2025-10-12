ALTER TABLE "StandupDocument" ADD COLUMN "wip_source" varchar DEFAULT 'llm';--> statement-breakpoint
ALTER TABLE "StandupDocument" ADD COLUMN "achievements_summary_source" varchar DEFAULT 'llm';