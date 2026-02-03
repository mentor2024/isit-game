-- Add explicit foreign key to user_profiles to allow PostgREST joins
alter table public.feedback
add constraint feedback_user_profile_fk
foreign key (user_id)
references public.user_profiles (id);
