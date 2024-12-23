-- Add preferences JSONB column to User table
ALTER TABLE "User" 
ADD COLUMN preferences jsonb NOT NULL DEFAULT '{
  "hasSeenWelcome": false,
  "language": "en"
}';
