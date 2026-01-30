-- Add attributes column to poll_objects for metadata (e.g. quad grouping sorting keys, awareness points)
alter table public.poll_objects
add column if not exists attributes jsonb default '{}'::jsonb;

-- Also add config to polls table if not already discussed (it was in the plan)
alter table public.polls
add column if not exists config jsonb default '{}'::jsonb;
