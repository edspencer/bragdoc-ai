ALTER TABLE "User" DROP COLUMN "level";--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN "renewal_period";--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN "last_payment";--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN "stripe_customer_id";--> statement-breakpoint
DROP TYPE "public"."renewal_period";--> statement-breakpoint
DROP TYPE "public"."user_level";