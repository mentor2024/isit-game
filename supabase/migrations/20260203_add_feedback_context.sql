-- Add context column to feedback for storing metadata (Stage, Level, Poll, etc.)
alter table public.feedback 
add column if not exists context jsonb;
