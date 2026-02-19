-- Create a function to get the current user's role safely (Security Definer bypasses RLS)
create or replace function public.get_my_role()
returns user_role as $$
declare
  _role user_role;
begin
  select role into _role from public.user_profiles where id = auth.uid();
  return _role;
end;
$$ language plpgsql security definer;

-- Drop the problematic "Superadmins can do everything" policy
drop policy if exists "Superadmins can do everything" on user_profiles;

-- Re-create it using the safe function
-- We split it for clarity, but FOR ALL is technically fine if the check doesn't touch the table directly via SQL query that uses RLS
-- But wait, get_my_role() accesses user_profiles. Since it is SECURITY DEFINER, it bypasses RLS on user_profiles!
-- So the recursion is broken.

create policy "Superadmins can do everything"
  on user_profiles for all
  using ( public.get_my_role() = 'superadmin' );

-- Update 'Users can read own profile' (Already exists, but ensuring it doesn't conflict)
-- We previously added "Allow authenticated read access" which is effectively public read for auth users.
-- We can keep that.

-- Create a helper for Admin checks too if needed
create or replace function public.is_admin()
returns boolean as $$
declare
  _role user_role;
begin
  _role := public.get_my_role();
  return _role in ('admin', 'superadmin');
end;
$$ language plpgsql security definer;
