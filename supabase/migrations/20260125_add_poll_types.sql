-- Add type to polls
alter table public.polls
add column if not exists type text not null default 'text_isit';

-- Add image_url to poll_objects
alter table public.poll_objects
add column if not exists image_url text;

-- Create storage bucket for poll images (if not exists logic is tricky in strict SQL, so we use policy check or just create via dashboard usually, but we can try inserting into storage.buckets if using supabase local/pg)
-- For now, we will rely on Supabase Dashboard/API for bucket creation usually, unless we have the 'storage' schema accessible.
-- We'll assume the USER or Admin creates the bucket 'poll_images', OR we try to insert it.

insert into storage.buckets (id, name, public)
values ('poll_images', 'poll_images', true)
on conflict (id) do nothing;

-- Allow public access to poll_images
create policy "Public Access Poll Images"
on storage.objects for select
using ( bucket_id = 'poll_images' );

-- Allow authenticated uploads
create policy "Auth Upload Poll Images"
on storage.objects for insert
with check ( bucket_id = 'poll_images' and auth.role() = 'authenticated' );

-- Existing constraints update? 
-- No logic changes needed for existing polls (default 'text_isit').
