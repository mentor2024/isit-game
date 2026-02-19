-- Create a 'comments' table for the recursive forum
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade, -- Self-reference for replies
  content text not null check (length(content) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.comments enable row level security;

-- Policies
-- 1. Everyone can view comments
create policy "Comments are viewable by everyone" 
  on public.comments for select using (true);

-- 2. Authenticated users can create comments
create policy "Authenticated users can create comments" 
  on public.comments for insert 
  with check (auth.role() = 'authenticated');

-- 3. Users can update their own comments
create policy "Users can update own comments" 
  on public.comments for update 
  using (auth.uid() = user_id);

-- 4. Users can delete their own comments
create policy "Users can delete own comments" 
  on public.comments for delete 
  using (auth.uid() = user_id);

-- Create index for performance
create index if not exists comments_poll_id_idx on public.comments(poll_id);
create index if not exists comments_parent_id_idx on public.comments(parent_id);
