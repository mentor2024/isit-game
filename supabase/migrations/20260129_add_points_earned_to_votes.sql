-- Add points_earned to poll_votes to track score contribution per interaction
ALTER TABLE poll_votes 
ADD COLUMN IF NOT EXISTS points_earned INT DEFAULT 0;

-- Optional: Update usage
-- We can backfill if needed, but for now defaults to 0.
