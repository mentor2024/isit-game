-- Add feedback column to poll_objects
ALTER TABLE poll_objects 
ADD COLUMN IF NOT EXISTS feedback TEXT DEFAULT '';

-- Add comment
COMMENT ON COLUMN poll_objects.feedback IS 'Explanation or feedback text specific to this answer choice. Used for dynamic assessment generation.';
