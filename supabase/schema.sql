-- ISIT Game Database Schema

-- 1. Tables

-- Polls table
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  instructions text,
  created_at timestamptz not null default now()
);

-- Poll Objects (two per poll: left/right words)
create table if not exists public.poll_objects (
  id text primary key,          -- e.g., 'poll:<poll_id>:L' and 'poll:<poll_id>:R'
  poll_id uuid not null references public.polls(id) on delete cascade,
  text text not null
);

-- Poll Votes (stores user choices)
create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null, -- references auth.users(id) if strictly enforcing, but uuid is fine for now
  selected_object_id text not null references public.poll_objects(id) on delete cascade,
  chosen_side text not null check (chosen_side in ('IS','IT')),
  created_at timestamptz not null default now()
);

-- Prevent duplicate voting on the same object by the same user
create unique index if not exists poll_votes_uniq
  on public.poll_votes(user_id, poll_id, selected_object_id);

-- 2. RPC Function

-- Vote ISIT function (Atomic voting for both objects)
create or replace function public.vote_isit(
  p_is_word_id text,
  p_it_word_id text,
  p_poll_id    uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Basic validation: both objects belong to poll
  if not exists (select 1 from poll_objects where id = p_is_word_id and poll_id = p_poll_id) then
    raise exception 'IS word does not belong to poll';
  end if;
  if not exists (select 1 from poll_objects where id = p_it_word_id and poll_id = p_poll_id) then
    raise exception 'IT word does not belong to poll';
  end if;

  -- Upsert IS row
  insert into poll_votes (poll_id, user_id, selected_object_id, chosen_side)
  values (p_poll_id, v_uid, p_is_word_id, 'IS')
  on conflict (user_id, poll_id, selected_object_id)
  do update set chosen_side = excluded.chosen_side;

  -- Upsert IT row
  insert into poll_votes (poll_id, user_id, selected_object_id, chosen_side)
  values (p_poll_id, v_uid, p_it_word_id, 'IT')
  on conflict (user_id, poll_id, selected_object_id)
  do update set chosen_side = excluded.chosen_side;
end
$$;

-- 3. Row Level Security (RLS) policies (Optional but recommended)
alter table public.polls enable row level security;
create policy "Tables are viewable by everyone" on public.polls for select using (true);

alter table public.poll_objects enable row level security;
create policy "Objects are viewable by everyone" on public.poll_objects for select using (true);

alter table public.poll_votes enable row level security;
create policy "Users can see their own votes" on public.poll_votes for select using (auth.uid() = user_id);
-- Also allow seeing aggregate results? Usually dealt with via aggregation functions or open read if not private.
-- For now, let's allow read access to everyone to calculate results safely or restrict to server logic.
-- Ideally, results are fetched via a secure view or simple select if we don't mind exposure.
-- Let's allow public read of votes for results calculation for now, or use service role in API.
create policy "Public view votes" on public.poll_votes for select using (true);

-- 4. Seed Data
insert into polls (id, title, instructions) values 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sample Poll 1', 'Assign these words!');

insert into poll_objects (id, poll_id, text) values 
  ('poll:1:L', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Hotdog'),
  ('poll:1:R', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sandwich'); 


