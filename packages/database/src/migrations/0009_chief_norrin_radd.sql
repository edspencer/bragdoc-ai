ALTER TABLE "Achievement" ADD COLUMN "standup_document_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_standup_document_id_StandupDocument_id_fk" FOREIGN KEY ("standup_document_id") REFERENCES "public"."StandupDocument"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
