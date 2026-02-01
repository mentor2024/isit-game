alter table public.user_profiles
add column if not exists current_stage int default 1,
add column if not exists current_level int default 1;
