CREATE TABLE IF NOT EXISTS "cli_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"device_name" text NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "preferences" SET DEFAULT '{"hasSeenWelcome":false,"language":"en"}'::jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cli_token" ADD CONSTRAINT "cli_token_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
