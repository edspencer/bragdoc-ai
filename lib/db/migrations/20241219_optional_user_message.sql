-- Make userMessageId optional for manually created achievements
ALTER TABLE "Brag" ALTER COLUMN "user_message_id" DROP NOT NULL;
