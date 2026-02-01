ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS quad_scores JSONB DEFAULT '{}'::jsonb;
