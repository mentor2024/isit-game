-- Force enable RLS on poll_votes
alter table public.poll_votes enable row level security;

-- Drop potentially conflicting or missing policies
drop policy if exists "Users can see their own votes" on public.poll_votes;
drop policy if exists "Public view votes" on public.poll_votes;

-- Re-create the SELECT policy so users can read their own votes
create policy "Users can see their own votes"
on public.poll_votes
for select
to authenticated
using (auth.uid() = user_id);

-- Also allow Service Role full access (implicit, but good to know)
-- We don't need a policy for service role as it bypasses RLS.
