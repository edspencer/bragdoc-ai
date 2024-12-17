ALTER TABLE "GitHubPullRequest" DROP CONSTRAINT "GitHubPullRequest_repository_id_pr_number_pk";--> statement-breakpoint
ALTER TABLE "Brag" ALTER COLUMN "event_start" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Brag" ALTER COLUMN "event_end" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "repo_pr_unique" ON "GitHubPullRequest" USING btree ("repository_id","pr_number");