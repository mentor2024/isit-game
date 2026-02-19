-- Create a table for user profiles with roles
create type user_role as enum ('superadmin', 'admin', 'user');

create table user_profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role user_role default 'user'::user_role,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table user_profiles enable row level security;

-- Policies for user_profiles
-- Superadmins can do anything
create policy "Superadmins can do everything"
  on user_profiles for all
  using (
    auth.uid() in (
      select id from user_profiles where role = 'superadmin'
    )
  );

-- Admins can view all profiles but only edit 'user' profiles (logic handled in app usually, but we can try to restrict here)
-- For simplicity, initially let's allow everyone to read their own profile
create policy "Users can read own profile"
  on user_profiles for select
  using ( auth.uid() = id );

-- Admins and Superadmins can read all profiles
create policy "Admins and Superadmins can read all profiles"
  on user_profiles for select
  using (
    auth.uid() in (
        select id from user_profiles where role in ('admin', 'superadmin')
    )
  );

-- Trigger to create a profile entry when a new user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, role)
  values (new.id, 'user');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- For existing users (if any), insert them into profiles
insert into public.user_profiles (id)
select id from auth.users
on conflict (id) do nothing;
