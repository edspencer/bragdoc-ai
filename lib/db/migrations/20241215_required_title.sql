-- Make title required and convert from text to varchar
ALTER TABLE "Brag"
  ALTER COLUMN title TYPE varchar(256),
  ALTER COLUMN title SET NOT NULL;

-- Backfill any NULL titles with a generic title
UPDATE "Brag"
SET title = CASE
  WHEN summary IS NOT NULL THEN LEFT(summary, 250) || '...'
  WHEN details IS NOT NULL THEN LEFT(details, 250) || '...'
  ELSE 'Achievement from ' || TO_CHAR(created_at, 'YYYY-MM-DD')
END
WHERE title IS NULL;
