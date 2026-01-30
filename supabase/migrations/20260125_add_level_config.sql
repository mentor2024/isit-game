-- Create Level Configurations table
create table if not exists public.level_configurations (
  stage int not null,
  level int not null,
  instructions text,
  enabled_modules jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (stage, level)
);

-- RLS
alter table public.level_configurations enable row level security;

-- Everyone can read level configs (needed for Level Up page)
create policy "Level configs are viewable by everyone" 
  on public.level_configurations for select using (true);

-- Only Admins can insert/update (This logic usually lives in Middleware/API, but we can enforce RLS if we trust Auth Roles)
-- For simplicity in this app iteration, we often trust the Service Role or check roles in the application layer.
-- But let's add a basic Admin-only write policy if User Roles logic exists.
-- Assuming `user_profiles` has role 'admin' or 'superadmin'.

create policy "Admins can insert level configs" 
  on public.level_configurations for insert 
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

create policy "Admins can update level configs" 
  on public.level_configurations for update
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );
