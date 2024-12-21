-- Add impact fields to Achievement table
ALTER TABLE "Achievement" 
ADD COLUMN impact INTEGER DEFAULT 2 CHECK (impact >= 1 AND impact <= 3),
ADD COLUMN impact_source VARCHAR CHECK (impact_source IN ('user', 'llm')) DEFAULT 'llm',
ADD COLUMN impact_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
