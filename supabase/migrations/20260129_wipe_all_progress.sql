-- Wipe all votes to allow a fresh start for testing
TRUNCATE TABLE public.poll_votes CASCADE;

-- Optionally ensure users are reset to Stage 0 if not already
UPDATE public.user_profiles SET current_stage = 0, current_level = 1, score = 0;
