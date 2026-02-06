ALTER TYPE "public"."renewal_period" ADD VALUE 'lifetime';--> statement-breakpoint
ALTER TYPE "public"."user_level" ADD VALUE 'paid' BEFORE 'demo';--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "free_credits" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "free_chat_messages" integer DEFAULT 20;--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "free_credits_non_negative" CHECK ("User"."free_credits" IS NULL OR "User"."free_credits" >= 0);--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "free_chat_messages_non_negative" CHECK ("User"."free_chat_messages" IS NULL OR "User"."free_chat_messages" >= 0);