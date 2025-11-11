CREATE INDEX "achievement_user_event_start_idx" ON "Achievement" USING btree ("user_id","event_start");--> statement-breakpoint
CREATE INDEX "achievement_workstream_id_idx" ON "Achievement" USING btree ("workstream_id");--> statement-breakpoint
CREATE INDEX "achievement_user_id_idx" ON "Achievement" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "achievement_event_start_idx" ON "Achievement" USING btree ("event_start");--> statement-breakpoint
CREATE INDEX "workstream_user_id_idx" ON "Workstream" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workstream_user_archived_idx" ON "Workstream" USING btree ("user_id","is_archived");