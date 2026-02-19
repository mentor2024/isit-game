-- Force add is_linked column if missing
ALTER TABLE level_configurations 
ADD COLUMN IF NOT EXISTS is_linked BOOLEAN DEFAULT FALSE;
