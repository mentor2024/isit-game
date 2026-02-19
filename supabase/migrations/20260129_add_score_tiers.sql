-- Add score_tiers column for multi-tier scoring
ALTER TABLE level_configurations 
ADD COLUMN IF NOT EXISTS score_tiers JSONB DEFAULT '[]'::jsonb;

-- Optional: We can drop the old threshold columns later, but keeping them for now is safer.
-- If you want to migrate existing data (though likely none exists yet), you could do:
-- UPDATE level_configurations SET score_tiers = jsonb_build_array(
--   jsonb_build_object('min_score', threshold_points, 'message', message_success),
--   jsonb_build_object('min_score', 0, 'message', message_fail)
-- ) WHERE score_tiers = '[]'::jsonb;
