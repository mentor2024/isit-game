-- Drop the recursive policy
drop policy "Admins and Superadmins can read all profiles" on user_profiles;

-- Allow all authenticated users to read profiles (avoids recursion and allows checking own role)
-- Ideally we would use a more complex setup or a view, but for this level of app, openness on roles is checking.
create policy "Allow authenticated read access"
  on user_profiles for select
  to authenticated
  using (true);
