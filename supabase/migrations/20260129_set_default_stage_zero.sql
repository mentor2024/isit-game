alter table public.user_profiles
alter column current_stage set default 0;

-- Optionally reset existing users who are at 1 to 0 if they haven't voted?
-- Or just let the user clear history.
-- The user said "I'm going to start over", so a migration that sets default is key for NEW sessions.
