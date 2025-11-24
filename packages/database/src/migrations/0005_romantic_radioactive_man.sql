CREATE TYPE "public"."source_type" AS ENUM('git', 'github', 'jira');--> statement-breakpoint
CREATE TABLE "Source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"type" "source_type" NOT NULL,
	"config" jsonb,
	"is_archived" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Achievement" ADD COLUMN "source_id" uuid;--> statement-breakpoint
ALTER TABLE "Achievement" ADD COLUMN "unique_source_id" varchar(512);--> statement-breakpoint
ALTER TABLE "Source" ADD CONSTRAINT "Source_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_user_id_idx" ON "Source" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "source_user_id_archived_idx" ON "Source" USING btree ("user_id","is_archived");--> statement-breakpoint
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_source_id_Source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."Source"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "achievement_user_source_idx" ON "Achievement" USING btree ("user_id","source_id");--> statement-breakpoint
CREATE INDEX "achievement_user_source_unique_idx" ON "Achievement" USING btree ("user_id","source_id","unique_source_id");