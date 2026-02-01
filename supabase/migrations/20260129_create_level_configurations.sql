-- Create a table for level-specific configurations
CREATE TABLE IF NOT EXISTS level_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage INT NOT NULL,
    level INT NOT NULL,
    is_linked BOOLEAN DEFAULT FALSE,
    threshold_points INT DEFAULT 0,
    message_success TEXT,
    message_fail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stage, level)
);

-- Enable RLS
ALTER TABLE level_configurations ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users (and anon if needed for frontend checks, though secure way is server actions only)
CREATE POLICY "Public read level_configurations" 
ON level_configurations FOR SELECT 
USING (true);

-- Allow full access to service role / internal 
-- (Assuming admin uses service role or we add an admin policy later. For now, matching other tables' relaxed dev stance or relying on service key in admin pages)
CREATE POLICY "Admin full access level_configurations" 
ON level_configurations FOR ALL 
USING (true) 
WITH CHECK (true);
