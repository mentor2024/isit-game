-- Drop the restrictive check constraint
alter table public.poll_votes
drop constraint if exists poll_votes_chosen_side_check;

-- Add a new constraint allowing 'group_a' and 'group_b' in addition to 'IS' and 'IT'
alter table public.poll_votes
add constraint poll_votes_chosen_side_check
check (chosen_side in ('IS', 'IT', 'group_a', 'group_b'));
