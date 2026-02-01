-- Add quad_feedback column to polls table
ALTER TABLE polls 
ADD COLUMN IF NOT EXISTS quad_feedback JSONB DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN polls.quad_feedback IS 'Stores feedback text for Quad Sort pairings. Keys are pairing IDs (e.g., "1-2", "1-3", "1-4").';
