-- Migration: Make userMessageId optional in Brag table
-- Description: This allows for manually created achievements without an associated user message

-- Make user_message_id column nullable
ALTER TABLE "Brag" ALTER COLUMN "user_message_id" DROP NOT NULL;
