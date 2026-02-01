-- Create Stage Configurations table
create table if not exists public.stage_configurations (
  stage int not null primary key,
  completion_bonus int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.stage_configurations enable row level security;

-- Everyone can read stage configs (needed for Game Logic)
create policy "Stage configs are viewable by everyone" 
  on public.stage_configurations for select using (true);

-- Only Admins can insert/update/delete
create policy "Admins can manage stage configs" 
  on public.stage_configurations for all
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );
