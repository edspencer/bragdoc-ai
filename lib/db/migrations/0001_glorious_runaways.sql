DO $$
BEGIN
  CREATE TYPE "public"."renewal_period" AS ENUM('monthly', 'yearly');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  CREATE TYPE "public"."user_level" AS ENUM('free', 'basic', 'pro');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  CREATE TYPE "public"."user_status" AS ENUM('active', 'banned', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "email_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "unsubscribed_at" timestamp,
  "email_types" text[],
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Drop default and convert "level"
ALTER TABLE "User"
  ALTER COLUMN "level" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "level" SET DATA TYPE user_level
  USING "level"::user_level;
ALTER TABLE "User"
  ALTER COLUMN "level" SET DEFAULT 'free';
--> statement-breakpoint

-- Drop default and convert "renewal_period"
ALTER TABLE "User"
  ALTER COLUMN "renewal_period" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "renewal_period" SET DATA TYPE renewal_period
  USING "renewal_period"::renewal_period;
ALTER TABLE "User"
  ALTER COLUMN "renewal_period" SET DEFAULT 'monthly';
--> statement-breakpoint

-- Drop default and convert "status"
ALTER TABLE "User"
  ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "status" SET DATA TYPE user_status
  USING "status"::user_status;
ALTER TABLE "User"
  ALTER COLUMN "status" SET DEFAULT 'active';
--> statement-breakpoint

-- Add "stripe_customer_id" only if it doesn’t already exist
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" varchar(256);
--> statement-breakpoint

DO $$
BEGIN
  ALTER TABLE "email_preferences"
    ADD CONSTRAINT "email_preferences_user_id_User_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."User"("id")
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
