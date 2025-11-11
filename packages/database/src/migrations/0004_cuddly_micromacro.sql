CREATE INDEX "account_user_id_idx" ON "Account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "account_provider_idx" ON "Account" USING btree ("providerId","accountId");--> statement-breakpoint
CREATE INDEX "chat_user_id_idx" ON "Chat" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "company_user_id_idx" ON "Company" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_user_id_idx" ON "Document" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "document_share_token_idx" ON "Document" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "message_chat_id_idx" ON "Message" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX "project_user_id_idx" ON "Project" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "Session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "standup_user_id_idx" ON "Standup" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "standup_document_standup_id_idx" ON "StandupDocument" USING btree ("standupId");--> statement-breakpoint
CREATE INDEX "standup_document_date_idx" ON "StandupDocument" USING btree ("date");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "User" USING btree ("email");