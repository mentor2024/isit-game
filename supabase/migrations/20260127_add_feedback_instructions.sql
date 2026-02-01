-- Add conditional instructions to polls
alter table public.polls
add column if not exists instructions_correct text,
add column if not exists instructions_incorrect text;
