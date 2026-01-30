-- Add correct_side column to poll_objects
alter table public.poll_objects 
add column if not exists correct_side text check (correct_side in ('IS', 'IT'));

-- Update existing objects (optional, just strictly for data integrity if needed later)
-- For now we leave them null or set a default if we knew what they were.
-- Since it's dev data, we can ignore updates for now.
