-- Allow authenticated users to insert votes (they can only see their own via select policy, but need insert for new votes)
create policy "Users can vote"
on public.poll_votes
for insert
to authenticated
with check (auth.uid() = user_id);

-- Fix the poll type and title for the seeded poll
update public.polls
set title = 'Quad Grouping',
    type = 'quad_sorting'
where title = 'Meta-Awareness Test 1';
