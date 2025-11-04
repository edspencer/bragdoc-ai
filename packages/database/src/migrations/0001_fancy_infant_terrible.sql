DROP TABLE "GitHubPullRequest" CASCADE;--> statement-breakpoint
DROP TABLE "GitHubRepository" CASCADE;--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN "github_access_token";