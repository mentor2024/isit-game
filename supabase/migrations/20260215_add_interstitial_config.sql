-- Add show_interstitial column to level_configurations
ALTER TABLE level_configurations
ADD COLUMN show_interstitial BOOLEAN DEFAULT TRUE;

-- Update existing Stage 0 Level 1 to FALSE (since it has the Assessment)
UPDATE level_configurations
SET show_interstitial = FALSE
WHERE stage = 0 AND level = 1;
