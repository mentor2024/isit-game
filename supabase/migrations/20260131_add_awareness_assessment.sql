-- Add awareness_assessment column to level_configurations
ALTER TABLE level_configurations 
ADD COLUMN IF NOT EXISTS awareness_assessment TEXT DEFAULT '';

-- Add comment
COMMENT ON COLUMN level_configurations.awareness_assessment IS 'Rich text content for the awareness assessment section of the level.';
