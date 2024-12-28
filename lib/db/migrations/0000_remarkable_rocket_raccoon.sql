ALTER TABLE "User" ADD COLUMN "level" varchar DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "renewal_period" varchar DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "last_payment" timestamp;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "status" varchar DEFAULT 'active' NOT NULL;