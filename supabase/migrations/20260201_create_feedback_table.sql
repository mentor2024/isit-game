
create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  feedback_type text not null check (feedback_type in ('Content', 'Bug Report')),
  feedback text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table feedback enable row level security;

-- Allow authenticated users to insert their own feedback
create policy "Users can insert their own feedback"
  on feedback for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Allow admins to view feedback (assuming admin role or similar, but for now just basic insert is key)
-- We'll allow service_role to do everything by default.
