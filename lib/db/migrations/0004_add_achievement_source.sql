-- Migration: Add source tracking to Brag table
-- Description: This allows tracking whether an achievement was created by LLM or manually

-- Add source column with enum constraint
DO $$ BEGIN
    CREATE TYPE achievement_source AS ENUM ('llm', 'manual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Brag" ADD COLUMN IF NOT EXISTS "source" achievement_source NOT NULL DEFAULT 'manual';

-- Update existing records from LLM to have the correct source
UPDATE "Brag" SET "source" = 'llm' WHERE "user_message_id" IS NOT NULL;
