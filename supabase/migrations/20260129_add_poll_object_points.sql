-- 1. Add points column to poll_objects (for variable scoring)
ALTER TABLE public.poll_objects
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

COMMENT ON COLUMN public.poll_objects.points IS 'Points awarded for selecting this object (0-20)';

-- 2. Add points_earned column to poll_votes (for historical record)
ALTER TABLE public.poll_votes
ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;

COMMENT ON COLUMN public.poll_votes.points_earned IS 'Points earned by the user for this vote at the time of submission';

-- 3. Rename Poll 2
UPDATE public.polls
SET title = 'Multi-choice (points)'
WHERE title = 'Justification Disambiguator' 
   OR title = 'Poll 2' 
   OR id = '8f5c6eb2-2763-413f-98c4-06b33cff1b28'; -- Using fixed ID if known, otherwise Title fallback
