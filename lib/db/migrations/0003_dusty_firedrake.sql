ALTER TABLE "Document" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "type" varchar(32);--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "share_token" varchar(64);--> statement-breakpoint