-- Allow authenticated users to update their own votes (required for upsert operations)
create policy "Users can update own votes"
on public.poll_votes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
