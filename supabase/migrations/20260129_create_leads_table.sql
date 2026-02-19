create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  email text,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.leads enable row level security;
create policy "Anyone can insert leads" on public.leads for insert with check (true);
-- Only admins can view (implicit by default deny)
