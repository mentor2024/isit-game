-- Add hierarchy columns to polls table
ALTER TABLE public.polls
ADD COLUMN IF NOT EXISTS stage integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS poll_order integer DEFAULT 1;

-- Add index for faster sorting/filtering match-making
CREATE INDEX IF NOT EXISTS idx_polls_hierarchy ON public.polls (stage ASC, level ASC, poll_order ASC);
