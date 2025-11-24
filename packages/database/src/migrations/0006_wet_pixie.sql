ALTER TABLE "Source" ADD COLUMN "project_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "Source" ADD CONSTRAINT "Source_project_id_Project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."Project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_project_id_idx" ON "Source" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "source_user_project_id_idx" ON "Source" USING btree ("user_id","project_id");